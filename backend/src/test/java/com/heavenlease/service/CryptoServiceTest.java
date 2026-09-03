package com.heavenlease.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/**
 * Verifies the crypto key hardening: the app must FAIL CLOSED in
 * production when APP_ENCRYPTION_KEY is missing (a deterministic
 * dev-only key must never be used outside dev/test).
 */
class CryptoServiceTest {

    @Test
    void prodFailsClosedWithoutEncryptionKey() {
        assertThatThrownBy(() -> new CryptoService("", "prod"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_ENCRYPTION_KEY");
    }

    @Test
    void prodRequiresNonBlankKey() {
        assertThatThrownBy(() -> new CryptoService("  ", "prod"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void devFallbackWorksWithoutKey() {
        CryptoService svc = new CryptoService("", "dev");
        String cipher = svc.encrypt("secret-value");
        assertThat(cipher).isNotBlank();
        assertThat(svc.decrypt(cipher)).isEqualTo("secret-value");
    }

    @Test
    void encryptDecryptRoundTrips() {
        CryptoService svc = new CryptoService("test-encryption-key-1234567890-abcdef", "test");
        String cipher = svc.encrypt("rzp_live_abc123");
        assertThat(cipher).isNotEqualTo("rzp_live_abc123");
        assertThat(svc.decrypt(cipher)).isEqualTo("rzp_live_abc123");
    }

    @Test
    void maskValueHidesMiddle() {
        CryptoService svc = new CryptoService("test-encryption-key-1234567890-abcdef", "test");
        assertThat(svc.maskValue("rzp_live_9XkLqQ7aZ")).startsWith("rzp_").endsWith("Z");
        assertThat(svc.maskValue("abc")).isEqualTo("••••••••");
        assertThat(svc.maskValue("")).isEmpty();
    }
}