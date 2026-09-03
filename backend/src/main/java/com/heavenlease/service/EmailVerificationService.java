package com.heavenlease.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.exception.SdkServiceException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.Body;
import software.amazon.awssdk.services.ses.model.Content;
import software.amazon.awssdk.services.ses.model.Destination;
import software.amazon.awssdk.services.ses.model.Message;
import software.amazon.awssdk.services.ses.model.SendEmailRequest;

/**
 * Email OTP verification. OTP emails are sent for real through AWS SES using
 * credentials resolved from the encrypted DB (Admin -> Integrations) or from
 * environment variables (AWS_SES_* with a fallback to AWS_* / OTP_FROM_EMAIL).
 * There is no demo mode — if SES is configured, a real email is sent; otherwise
 * the request fails with a clear error so misconfiguration is never silent.
 */
@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_EXPIRY_MINUTES = 30;

    private final Map<String, VerificationCode> codes = new ConcurrentHashMap<>();
    private final IntegrationService integrationService;

    /** Effective AWS SES credentials: prefer encrypted DB, then env AWS_SES_* (fallback AWS_*, OTP_FROM_EMAIL). */
    @Value("${AWS_SES_ACCESS_KEY:${AWS_ACCESS_KEY_ID:}}")
    private String sesAccessKey;
    @Value("${AWS_SES_SECRET_KEY:${AWS_SECRET_ACCESS_KEY:}}")
    private String sesSecretKey;
    @Value("${AWS_SES_REGION:${AWS_REGION:ap-south-1}}")
    private String sesRegion;
    @Value("${AWS_SES_FROM_EMAIL:${OTP_FROM_EMAIL:no-reply@heavenlease.in}}")
    private String fromEmail;

    public EmailVerificationService(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    // Resolve the effective SES config: prefer encrypted DB, then environment variables.
    private String sesAccessKey() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SES_ACCESS_KEY) : null;
        return (db != null && !db.isBlank()) ? db : sesAccessKey;
    }
    private String sesSecretKey() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SES_SECRET_KEY) : null;
        return (db != null && !db.isBlank()) ? db : sesSecretKey;
    }
    private String sesRegion() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SES_REGION) : null;
        return (db != null && !db.isBlank()) ? db : sesRegion;
    }
    private String sesFromEmail() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.AWS_SES_FROM_EMAIL) : null;
        return (db != null && !db.isBlank()) ? db : fromEmail;
    }

    public boolean isConfigured() {
        return sesAccessKey() != null && !sesAccessKey().isBlank()
                && sesSecretKey() != null && !sesSecretKey().isBlank()
                && sesRegion() != null && !sesRegion().isBlank()
                && sesFromEmail() != null && !sesFromEmail().isBlank();
    }

    private record VerificationCode(String code, LocalDateTime expiresAt) {}

    public String generateCode(String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        codes.put(email, new VerificationCode(code, LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES)));
        sendOtpEmail(email, code);
        return code;
    }

    private void sendOtpEmail(String email, String code) {
        if (!isConfigured()) {
            throw new IllegalStateException("AWS SES is not configured. Set AWS_SES_ACCESS_KEY / AWS_SES_SECRET_KEY / AWS_SES_REGION / AWS_SES_FROM_EMAIL (or via Admin -> Integrations) to send real verification emails.");
        }

        try {
            String accessKey = sesAccessKey();
            String secretKey = sesSecretKey();
            String region = sesRegion();
            String from = sesFromEmail();

            AwsBasicCredentials creds = AwsBasicCredentials.create(accessKey, secretKey);
            try (SesClient ses = SesClient.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(creds))
                    .build()) {

                String htmlBody = "<html><body style='font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;'>"
                        + "<div style='max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;'>"
                        + "<div style='text-align: center; margin-bottom: 20px;'>"
                        + "<span style='font-family: Georgia, serif; font-size: 22px; font-weight: 700; color: #1e1b4b;'>Heaven<span style='color: #4F46E5;'>Lease</span></span>"
                        + "</div>"
                        + "<h2 style='color: #0f172a; font-size: 20px; margin-bottom: 8px;'>Your Verification Code</h2>"
                        + "<p style='color: #64748b; font-size: 14px; line-height: 1.6;'>Use the 6-digit code below to complete your action. The code expires in 30 minutes.</p>"
                        + "<div style='background: #eef2ff; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;'>"
                        + "<span style='font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #4F46E5;'>" + code + "</span>"
                        + "</div>"
                        + "<p style='color: #94a3b8; font-size: 12px;'>If you did not request this code, you can safely ignore this email.</p>"
                        + "</div></body></html>";

                SendEmailRequest request = SendEmailRequest.builder()
                        .source(from)
                        .destination(Destination.builder().toAddresses(email).build())
                        .message(Message.builder()
                                .subject(Content.builder().charset("UTF-8").data("Your HeavenLease Verification Code").build())
                                .body(Body.builder()
                                        .html(Content.builder().charset("UTF-8").data(htmlBody).build())
                                        .build())
                                .build())
                        .build();

                ses.sendEmail(request);
                log.info("SES email sent to {}", email);
            }
        } catch (SdkClientException | SdkServiceException e) {
            log.error("Failed to send email via SES for {}: {}", email, e.getMessage());
            String msg = e.getMessage() == null ? "" : e.getMessage();
            // SES region-specific: a common cause is that the FROM address isn't
            // verified in the SAME REGION SES is configured for. Give a direct hint.
            if (msg.contains("not verified") || msg.contains("identity") || msg.contains("550") || msg.contains("MessageRejected")) {
                throw new IllegalStateException(
                        "Email send failed: the sender '" + sesFromEmail() + "' is not verified in AWS SES in region '"
                                + sesRegion() + "'. Verify this address (or its domain) in the SES console under Identity Management, then retry. Original error: " + msg);
            }
            throw new IllegalStateException("Failed to send verification email: " + msg);
        }
    }

    public boolean verifyCode(String email, String code) {
        VerificationCode stored = codes.get(email);
        if (stored == null) return false;
        if (stored.expiresAt().isBefore(LocalDateTime.now())) {
            codes.remove(email);
            return false;
        }
        boolean valid = stored.code().equals(code);
        if (valid) codes.remove(email);
        return valid;
    }

    public void invalidateCode(String email) {
        codes.remove(email);
    }
}