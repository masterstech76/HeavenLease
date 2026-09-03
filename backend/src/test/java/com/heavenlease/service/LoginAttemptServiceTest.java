package com.heavenlease.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the login lockout service (pure in-memory logic, no Spring
 * context needed). Verifies that repeated failures trigger a lockout and that
 * a successful login resets the counter.
 */
class LoginAttemptServiceTest {

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService();
    }

    @Test
    void notLockedInitially() {
        assertFalse(service.isLocked("test@example.com"));
    }

    @Test
    void lockedAfterFiveFailures() {
        for (int i = 0; i < 5; i++) {
            service.loginFailed("test@example.com");
        }
        assertTrue(service.isLocked("test@example.com"));
    }

    @Test
    void notLockedAfterFourFailures() {
        for (int i = 0; i < 4; i++) {
            service.loginFailed("test@example.com");
        }
        assertFalse(service.isLocked("test@example.com"));
    }

    @Test
    void successfulLoginResetsLock() {
        for (int i = 0; i < 5; i++) {
            service.loginFailed("test@example.com");
        }
        assertTrue(service.isLocked("test@example.com"));
        service.loginSucceeded("test@example.com");
        assertFalse(service.isLocked("test@example.com"));
    }

    @Test
    void failuresAreKeyedPerUser() {
        for (int i = 0; i < 5; i++) {
            service.loginFailed("user1@example.com");
        }
        assertTrue(service.isLocked("user1@example.com"));
        assertFalse(service.isLocked("user2@example.com"));
    }
}