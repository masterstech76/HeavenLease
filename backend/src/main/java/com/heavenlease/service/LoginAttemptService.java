package com.heavenlease.service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

/**
 * Tracks failed login attempts per identifier (email or phone) and applies a
 * temporary lockout after a configurable threshold. In-memory only — simple,
 * distributed-ready alternative can replace this with Redis later.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_SECONDS = 900; // 15 minutes

    private record Attempt(int failures, Instant lockedUntil) {}

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isLocked(String key) {
        Attempt a = attempts.get(key);
        if (a == null) return false;
        if (a.lockedUntil != null && a.lockedUntil.isAfter(Instant.now())) {
            return true;
        }
        // Lock expired
        if (a.lockedUntil != null) {
            attempts.remove(key);
        }
        return false;
    }

    public void loginFailed(String key) {
        attempts.compute(key, (k, existing) -> {
            if (existing == null) {
                return new Attempt(1, null);
            }
            int next = existing.failures + 1;
            if (next >= MAX_ATTEMPTS) {
                return new Attempt(next, Instant.now().plusSeconds(LOCKOUT_SECONDS));
            }
            return new Attempt(next, null);
        });
    }

    public void loginSucceeded(String key) {
        attempts.remove(key);
    }
}