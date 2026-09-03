package com.heavenlease.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * AES-256-GCM encryption for third-party API secrets at rest.
 * The master key comes from environment variable APP_ENCRYPTION_KEY
 * (32+ bytes). If unset in dev, a deterministic dev-only fallback is used,
 * but a warning is logged so production always sets a real key.
 */
@Service
public class CryptoService {

    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final SecretKey key;
    private final SecureRandom secureRandom = new SecureRandom();

    public CryptoService(@Value("${app.encryption-key:}") String encryptionKey,
                     @Value("${spring.profiles.active:prod}") String activeProfiles) {
        String resolved = encryptionKey;
        if (resolved == null || resolved.isBlank()) {
            boolean devProfile = activeProfiles != null
                    && (activeProfiles.contains("dev") || activeProfiles.contains("test"));
            // SECURITY: a publicly-known deterministic fallback is ONLY allowed in
            // dev/test. In production this is fail-closed — the app refuses to boot
            // with a predictable key (all stored API secrets would be decryptable).
            if (!devProfile) {
                throw new IllegalStateException(
                        "APP_ENCRYPTION_KEY is required in production. Set a strong 32+ char key in backend/.env "
                        + "(the dev-only fallback key is never used outside dev/test).");
            }
            resolved = "dev-only-heavenlease-encryption-key-000000000000";
            System.err.println("WARNING: app.encryption-key not set! Using DEV fallback. Set APP_ENCRYPTION_KEY in production.");
        }
        byte[] keyBytes = resolved.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            // Pad/truncate to 32 bytes (AES-256 requires 32)
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, 32));
            keyBytes = padded;
        } else if (keyBytes.length > 32) {
            byte[] truncated = new byte[32];
            System.arraycopy(keyBytes, 0, truncated, 0, 32);
            keyBytes = truncated;
        }
        this.key = new SecretKeySpec(keyBytes, "AES");
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new RuntimeException("Failed to encrypt secret", e);
        }
    }

    public String decrypt(String encrypted) {
        try {
            byte[] combined = Base64.getDecoder().decode(encrypted);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherText.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] plain = cipher.doFinal(cipherText);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new RuntimeException("Failed to decrypt secret", e);
        }
    }

    /**
     * Returns a masked preview of a secret value e.g. "rzp_live_••••••••9XkL".
     * Empty/blank input returns an empty string.
     */
    public String maskValue(String plaintextValue) {
        if (plaintextValue == null || plaintextValue.isBlank()) return "";
        if (plaintextValue.length() <= 8) {
            return "••••••••";
        }
        String head = plaintextValue.length() > 4 ? plaintextValue.substring(0, 4) : plaintextValue;
        String tail = plaintextValue.substring(plaintextValue.length() - 4);
        return head + "••••••••" + tail;
    }
}