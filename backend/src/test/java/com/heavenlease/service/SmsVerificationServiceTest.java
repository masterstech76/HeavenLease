package com.heavenlease.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.heavenlease.model.PhoneOtp;
import com.heavenlease.model.User;
import com.heavenlease.repository.PhoneOtpRepository;
import com.heavenlease.repository.UserRepository;

/**
 * Tests for the SELF-HOSTED phone OTP system: works with NO AWS SNS configured,
 * stores only hashed codes, rate-limits resends, and invalidates after 5 wrong
 * attempts.
 */
@SuppressWarnings({"unused", "null"})
class SmsVerificationServiceTest {

    private PhoneOtpRepository phoneOtpRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private IntegrationService integrationService;
    private SmsVerificationService service;

    /** Holds the row the service last saved, so verify() can read it back. */
    private final AtomicReference<PhoneOtp> savedOtp = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        phoneOtpRepository = mock(PhoneOtpRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = mock(NotificationService.class);
        integrationService = mock(IntegrationService.class);
        service = new SmsVerificationService(phoneOtpRepository, userRepository, notificationService, integrationService);
        // No SNS configured -> triggers the self-hosted path.
        ReflectionTestUtils.setField(service, "snsAccessKey", "");
        ReflectionTestUtils.setField(service, "snsSecretKey", "");
        ReflectionTestUtils.setField(service, "snsRegion", "");
        ReflectionTestUtils.setField(service, "selfHostedPreviewEnabled", true);

        savedOtp.set(null);
        // save() stores the row so findFirst() can return it during verify.
        when(phoneOtpRepository.save(any(PhoneOtp.class))).thenAnswer(inv -> {
            PhoneOtp saved = inv.getArgument(0);
            saved.setId(1L);
            savedOtp.set(saved);
            return saved;
        });
        when(phoneOtpRepository.findFirstByPhoneOrderByCreatedAtDesc("9876543210"))
                .thenAnswer(inv -> Optional.ofNullable(savedOtp.get()));
        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.empty());
    }

    @Test
    void generateCode_returnsInAppPreviewWhenNoSmsGateway() {
        SmsVerificationService.OtpDelivery d = service.generateCode("+91 98765 43210");

        assertThat(d.deliveryChannel()).isEqualTo("IN_APP");
        assertThat(d.otpPreview()).matches("\\d{6}");
        assertThat(d.resendAfterSeconds()).isEqualTo(30);
        // Only a hash is persisted — never the raw code.
        assertThat(savedOtp.get().getCodeHash()).isNotEqualTo(d.otpPreview());
        assertThat(savedOtp.get().getCodeHash()).isNotEmpty();
        assertThat(savedOtp.get().getSalt()).isNotEmpty();
        assertThat(savedOtp.get().getPhone()).isEqualTo("9876543210");
        assertThat(savedOtp.get().getExpiresAt()).isAfter(java.time.LocalDateTime.now());
    }

    @Test
    void generateCode_notifiesExistingUser() {
        User user = new User();
        user.setId(7L);
        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.of(user));

        service.generateCode("9876543210");

        verify(notificationService).notify(eq(7L), eq("Your HeavenLease OTP"), anyString(), eq("OTP"));
    }

    @Test
    void resend_isRateLimitedByCooldown() {
        PhoneOtp recent = new PhoneOtp();
        recent.setLastResendAt(java.time.LocalDateTime.now());
        recent.setResendCount(1);
        when(phoneOtpRepository.findFirstByPhoneOrderByCreatedAtDesc("9876543210")).thenReturn(Optional.of(recent));

        assertThatThrownBy(() -> service.generateCode("9876543210"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Please wait");
    }

    @Test
    void snsSuccess_sendsSmsOnlyAndDisablesSelfHostedChannels() {
        // A working SNS gateway must make the self-hosted system (in-app bell +
        // on-screen preview) disable itself automatically — SMS is the only channel.
        SmsVerificationService working = new SmsVerificationService(
                phoneOtpRepository, userRepository, notificationService, integrationService) {
            @Override
            boolean trySendSms(String normalizedPhone, String code) {
                return true; // simulate a successful real SMS publish
            }
        };
        ReflectionTestUtils.setField(working, "snsAccessKey", "AKIA_TEST");
        ReflectionTestUtils.setField(working, "snsSecretKey", "test-secret");
        ReflectionTestUtils.setField(working, "snsRegion", "ap-south-1");
        ReflectionTestUtils.setField(working, "selfHostedPreviewEnabled", true);

        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.of(new User() {{
            setId(7L);
        }}));

        SmsVerificationService.OtpDelivery d = working.generateCode("9876543210");

        assertThat(d.deliveryChannel()).isEqualTo("SMS");
        assertThat(d.otpPreview()).isNull();
        // Self-hosted channels are disabled when real SMS works.
        verify(notificationService, never()).notify(any(), any(), any(), any());
    }

    @Test
    void snsConfiguredButFailing_fallsBackToSelfHostedPreview() {
        // SNS keys present but the publish API fails at runtime -> users must still
        // receive the code via the self-hosted on-screen preview.
        SmsVerificationService failing = new SmsVerificationService(
                phoneOtpRepository, userRepository, notificationService, integrationService) {
            @Override
            boolean trySendSms(String normalizedPhone, String code) {
                return false; // simulate SNS returning the sandbox/access error
            }
        };
        ReflectionTestUtils.setField(failing, "snsAccessKey", "AKIA_TEST");
        ReflectionTestUtils.setField(failing, "snsSecretKey", "test-secret");
        ReflectionTestUtils.setField(failing, "snsRegion", "ap-south-1");
        ReflectionTestUtils.setField(failing, "selfHostedPreviewEnabled", true);

        SmsVerificationService.OtpDelivery d = failing.generateCode("9876543210");

        assertThat(d.deliveryChannel()).isEqualTo("IN_APP");
        assertThat(d.otpPreview()).matches("\\d{6}");
    }

    @Test
    void verifyCode_correctCodeSucceedsAndDeletesRow() {
        SmsVerificationService.OtpDelivery d = service.generateCode("9876543210");

        boolean ok = service.verifyCode("9876543210", d.otpPreview());

        assertThat(ok).isTrue();
        verify(phoneOtpRepository).delete(any(PhoneOtp.class));
    }

    @Test
    void verifyCode_wrongCodeFailsAndCountsAttempt() {
        service.generateCode("9876543210");

        boolean ok = service.verifyCode("9876543210", "000000");

        assertThat(ok).isFalse();
        // The stored row now has 1 attempt.
        assertThat(savedOtp.get().getAttempts()).isEqualTo(1);
    }

    @Test
    void verifyCode_fiveWrongAttemptsInvalidatesCode() {
        service.generateCode("9876543210");

        for (int i = 0; i < 5; i++) {
            service.verifyCode("9876543210", "000000");
        }
        boolean ok = service.verifyCode("9876543210", "000000");

        assertThat(ok).isFalse();
        verify(phoneOtpRepository).delete(any(PhoneOtp.class));
    }

    @Test
    void verifyCode_afterDeleteReturnsFalse() {
        service.generateCode("9876543210");
        // Simulate the row being deleted already (empty).
        when(phoneOtpRepository.findFirstByPhoneOrderByCreatedAtDesc("9876543210")).thenReturn(Optional.empty());

        boolean ok = service.verifyCode("9876543210", "123456");

        assertThat(ok).isFalse();
    }
}