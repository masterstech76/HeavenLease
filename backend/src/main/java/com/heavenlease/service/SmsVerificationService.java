package com.heavenlease.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.heavenlease.model.PhoneOtp;
import com.heavenlease.model.User;
import com.heavenlease.repository.PhoneOtpRepository;
import com.heavenlease.repository.UserRepository;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;

/**
 * SELF-HOSTED phone OTP delivery system.
 *
 * This service no longer depends on AWS SNS being healthy in your account.
 * Delivery works in three layers, with the self-hosted fallback AUTO-DISABLED
 * the moment real SMS works:
 *
 *   1. REAL SMS   — used as the ONLY channel whenever AWS SNS credentials are
 *                   configured AND the publish succeeds. While SMS works, the
 *                   self-hosted system (in-app bell + on-screen preview) is
 *                   disabled automatically so codes are never leaked on-screen.
 *   2. IN-APP     — used ONLY when SNS is unavailable (not configured or the
 *                   send failed): the OTP is pushed to the matching user's
 *                   notification bell.
 *   3. ON-SCREEN  — used ONLY when both SNS and the in-app bell cannot deliver:
 *                   the OTP is returned in the API response (otpPreview) so the
 *                   frontend can display it inline. This is the zero-external-
 *                   services fallback that keeps signup/login/verify working.
 *
 * Codes are 6 digits, expire in 10 minutes, are stored as salted SHA-256 hashes,
 * and are rate-limited (30s resend cooldown, max 3 resends per 10 minutes,
 * max 5 verify attempts before the code is invalidated).
 */
@Service
@SuppressWarnings("null")
public class SmsVerificationService {

    private static final Logger log = LoggerFactory.getLogger(SmsVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 30;
    private static final int MAX_RESENDS_PER_WINDOW = 3;
    private static final int MAX_VERIFY_ATTEMPTS = 5;

    /** Whether the on-screen otpPreview fallback is allowed when no SMS gateway works. */
    @Value("${app.otp.self-hosted-preview:true}")
    private boolean selfHostedPreviewEnabled;

    private final PhoneOtpRepository phoneOtpRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final IntegrationService integrationService;

    /** Effective AWS SNS credentials: prefer encrypted DB, then env AWS_SNS_* (fallback AWS_). */
    @Value("${AWS_SNS_ACCESS_KEY:${AWS_ACCESS_KEY_ID:}}")
    private String snsAccessKey;
    @Value("${AWS_SNS_SECRET_KEY:${AWS_SECRET_ACCESS_KEY:}}")
    private String snsSecretKey;
    @Value("${AWS_SNS_REGION:${AWS_REGION:ap-south-1}}")
    private String snsRegion;
    @Value("${AWS_SNS_SENDER_ID:HEAVENLEASE}")
    private String snsSenderId;

    public SmsVerificationService(PhoneOtpRepository phoneOtpRepository,
                                  UserRepository userRepository,
                                  NotificationService notificationService,
                                  IntegrationService integrationService) {
        this.phoneOtpRepository = phoneOtpRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.integrationService = integrationService;
    }

    /** Result of issuing an OTP, consumed by the controller to build the response. */
    public record OtpDelivery(String deliveryChannel,     // "SMS" | "IN_APP"
                              String otpPreview,          // 6-digit code (null when real SMS sent)
                              String deliveryMessage,     // human-readable hint for the UI
                              int resendAfterSeconds) {}

    /** Normalizes a phone to a 10-digit string without +91 / 0 / separators. */
    public static String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("91") && digits.length() == 12) digits = digits.substring(2);
        if (digits.startsWith("0") && digits.length() == 11) digits = digits.substring(1);
        return digits;
    }

    private String snsAccessKey() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SNS_ACCESS_KEY) : null;
        return (db != null && !db.isBlank()) ? db : snsAccessKey;
    }
    private String snsSecretKey() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SNS_SECRET_KEY) : null;
        return (db != null && !db.isBlank()) ? db : snsSecretKey;
    }
    private String snsRegion() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SNS_REGION) : null;
        return (db != null && !db.isBlank()) ? db : snsRegion;
    }
    private String snsSenderId() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SNS_SENDER_ID) : null;
        return (db != null && !db.isBlank()) ? db : snsSenderId;
    }

    public boolean isConfigured() {
        return snsAccessKey() != null && !snsAccessKey().isBlank()
                && snsSecretKey() != null && !snsSecretKey().isBlank()
                && snsRegion() != null && !snsRegion().isBlank();
    }

    /** Generates a 6-digit OTP and delivers it (SMS if possible, otherwise in-app + on-screen). */
    @Transactional
    public OtpDelivery generateCode(String phone) {
        String normalized = normalizePhone(phone);
        if (normalized.length() != 10) {
            throw new IllegalArgumentException("Please enter a valid 10-digit phone number");
        }

        LocalDateTime now = LocalDateTime.now();
        Optional<PhoneOtp> existing = phoneOtpRepository.findFirstByPhoneOrderByCreatedAtDesc(normalized);

        // Cooldown: prevent resend-flooding.
        if (existing.isPresent() && existing.get().getLastResendAt() != null
                && existing.get().getLastResendAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(now)) {
            long wait = ChronoUnit.SECONDS.between(now, existing.get().getLastResendAt().plusSeconds(RESEND_COOLDOWN_SECONDS)) + 1;
            throw new IllegalStateException("Please wait " + wait + "s before requesting a new OTP");
        }
        // Cap total resends within the expiry window.
        int resendCount = existing.isPresent() ? existing.get().getResendCount() : 0;
        if (resendCount >= MAX_RESENDS_PER_WINDOW) {
            throw new IllegalStateException("Too many OTP requests. Please try again in " + CODE_EXPIRY_MINUTES + " minutes");
        }

        // Fresh 6-digit code.
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        String salt = randomSalt();
        String hash = hashCode(code, salt);

        // Replace any prior row for this phone with the fresh code.
        phoneOtpRepository.deleteByPhone(normalized);
        PhoneOtp otp = new PhoneOtp();
        otp.setPhone(normalized);
        otp.setCodeHash(hash);
        otp.setSalt(salt);
        otp.setExpiresAt(now.plusMinutes(CODE_EXPIRY_MINUTES));
        otp.setAttempts(0);
        otp.setResendCount(resendCount + 1);
        otp.setLastResendAt(now);
        phoneOtpRepository.save(otp);

        // Deliver via real SMS when SNS is configured AND the publish succeeds.
        // When SMS works it is the ONLY channel: the self-hosted system (in-app
        // bell + on-screen preview) is automatically disabled so a working SMS
        // provider never leaks the code on-screen or into the notification center.
        boolean smsSent = isConfigured() && trySendSms(normalized, code);
        if (smsSent) {
            return new OtpDelivery("SMS", null,
                    "A 6-digit OTP has been sent to your phone via SMS.",
                    RESEND_COOLDOWN_SECONDS);
        }

        // ---- Self-hosted fallback: SNS not configured OR the SMS send failed ----
        // Delivery layer 2: in-app notification to any existing user with this phone.
        Optional<User> user = userRepository.findByPhone(normalized);
        if (user.isPresent()) {
            notificationService.notify(user.get().getId(),
                    "Your HeavenLease OTP",
                    "Your 6-digit verification code is " + code + ". It expires in " + CODE_EXPIRY_MINUTES + " minutes.",
                    "OTP");
        }

        // Delivery layer 3: on-screen preview (only used when no SMS gateway delivered).
        if (selfHostedPreviewEnabled) {
            return new OtpDelivery("IN_APP", code,
                    "OTP delivered to your screen + notification bell (SMS gateway not available).",
                    RESEND_COOLDOWN_SECONDS);
        }
        if (user.isPresent()) {
            return new OtpDelivery("IN_APP", null,
                    "OTP delivered to your notification bell (SMS gateway not available).",
                    RESEND_COOLDOWN_SECONDS);
        }
        throw new IllegalStateException("No SMS gateway available and on-screen OTP preview is disabled. Enable preview or configure SNS.");
    }

    /** Verifies a submitted code against the stored hash; deletes on success or after too many attempts. */
    @Transactional
    public boolean verifyCode(String phone, String code) {
        String normalized = normalizePhone(phone);
        if (code == null || code.isBlank()) return false;
        Optional<PhoneOtp> existing = phoneOtpRepository.findFirstByPhoneOrderByCreatedAtDesc(normalized);
        if (existing.isEmpty()) return false;

        PhoneOtp otp = existing.get();
        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            phoneOtpRepository.delete(otp);
            return false;
        }
        // Brute-force guard: too many wrong attempts invalidates the code.
        if (otp.getAttempts() >= MAX_VERIFY_ATTEMPTS) {
            phoneOtpRepository.delete(otp);
            return false;
        }

        boolean matches = otp.getCodeHash().equals(hashCode(code, otp.getSalt()));
        if (matches) {
            phoneOtpRepository.delete(otp);
        } else {
            otp.setAttempts(otp.getAttempts() + 1);
            phoneOtpRepository.save(otp);
        }
        return matches;
    }

    public void invalidateCode(String phone) {
        phoneOtpRepository.deleteByPhone(normalizePhone(phone));
    }

    /** Opportunistic cleanup so stale rows don't accumulate. Runs every 10 minutes. */
    @Transactional
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 600_000)
    public void cleanupExpired() {
        phoneOtpRepository.deleteExpired(LocalDateTime.now());
    }

    // ===== helpers =====

    boolean trySendSms(String normalizedPhone, String code) {
        try {
            AwsBasicCredentials creds = AwsBasicCredentials.create(snsAccessKey(), snsSecretKey());
            try (SnsClient sns = SnsClient.builder()
                    .region(software.amazon.awssdk.regions.Region.of(snsRegion()))
                    .credentialsProvider(StaticCredentialsProvider.create(creds))
                    .build()) {

                String message = "Your HeavenLease verification code is " + code + ". It expires in " + CODE_EXPIRY_MINUTES + " minutes.";
                Map<String, MessageAttributeValue> attributes = new java.util.HashMap<>();
                String senderId = snsSenderId();
                if (senderId != null && !senderId.isBlank()) {
                    attributes.put("AWS.SNS.SMS.SenderID", MessageAttributeValue.builder()
                            .stringValue(senderId).dataType("String").build());
                }
                attributes.put("AWS.SNS.SMS.SMSType", MessageAttributeValue.builder()
                        .stringValue("Transactional").dataType("String").build());

                String e164 = "+91" + normalizedPhone;
                PublishRequest request = PublishRequest.builder()
                        .phoneNumber(e164)
                        .message(message)
                        .messageAttributes(attributes)
                        .build();
                sns.publish(request);
                log.info("SNS SMS sent to {}", e164);
                return true;
            }
        } catch (SdkException | IllegalArgumentException e) {
            // Self-hosted fallback: never fail the OTP flow because SNS misbehaves.
            log.warn("SNS SMS failed ({}), falling back to in-app/on-screen OTP delivery", e.getMessage());
            return false;
        }
    }

    private static String randomSalt() {
        byte[] b = new byte[16];
        RANDOM.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    private static String hashCode(String code, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] digest = md.digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("OTP hashing failed", e);
        }
    }
}