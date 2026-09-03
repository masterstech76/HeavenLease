package com.heavenlease.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/**
 * JWT secret hardening: the app must refuse to boot with the known
 * dev/test fallback secrets (a token signed with them is forgeable).
 */
@SuppressWarnings("unused")
class JwtServiceTest {

    @Test
    void rejectsKnownDevFallbackSecret() {
        JwtService svc = new JwtService();
        setField(svc, "secret", "HeavenLease-dev-secret-key-2026-change-me-now");
        setField(svc, "expirationMs", 86400000L);
        assertThatThrownBy(svc::validateSecret)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("known dev/test fallback");
    }

    @Test
    void rejectsShortSecret() {
        JwtService svc = new JwtService();
        setField(svc, "secret", "short");
        setField(svc, "expirationMs", 86400000L);
        assertThatThrownBy(svc::validateSecret)
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void acceptsStrongUniqueSecret() {
        JwtService svc = new JwtService();
        setField(svc, "secret", "a-strong-unique-secret-that-is-longer-than-32-characters!");
        setField(svc, "expirationMs", 86400000L);
        svc.validateSecret(); // no exception
        assertThat(true).isTrue();
    }

    private void setField(Object target, String field, Object value) {
        try {
            java.lang.reflect.Field f = target.getClass().getDeclaredField(field);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException | RuntimeException e) {
            throw new RuntimeException(e);
        }
    }
}