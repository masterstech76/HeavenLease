package com.heavenlease.service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.heavenlease.model.IntegrationConfig;
import com.heavenlease.repository.IntegrationConfigRepository;

/**
 * Manages the encrypted integration credentials. Only the ADMIN can read
 * status/masked previews or write new secrets. Secrets are stored encrypted
 * (AES-256-GCM) and never returned in full by any API.
 */
@Service
@SuppressWarnings("null")
public class IntegrationService {

    // Canonical config keys grouped by integration
    public static final String RAZORPAY_KEY_ID = "razorpay_key_id";
    public static final String RAZORPAY_KEY_SECRET = "razorpay_key_secret";
    public static final String AWS_SES_ACCESS_KEY = "aws_ses_access_key";
    public static final String AWS_SES_SECRET_KEY = "aws_ses_secret_key";
    public static final String AWS_SES_REGION = "aws_ses_region";
    public static final String AWS_SES_FROM_EMAIL = "aws_ses_from_email";
    public static final String AWS_SNS_ACCESS_KEY = "aws_sns_access_key";
    public static final String AWS_SNS_SECRET_KEY = "aws_sns_secret_key";
    public static final String AWS_SNS_REGION = "aws_sns_region";
    public static final String AWS_SNS_SENDER_ID = "aws_sns_sender_id";
    public static final String GOOGLE_CLIENT_ID = "google_client_id";
    public static final String GOOGLE_CLIENT_SECRET = "google_client_secret";
    public static final String RECAPTCHA_SITE_KEY = "recaptcha_site_key";
    public static final String RECAPTCHA_SECRET_KEY = "recaptcha_secret_key";

    // Keys that are NOT secret (region, from-email, sender-id, client-id, recaptcha site key) — shown plainly
    private static final java.util.Set<String> PLAINTEXT_KEYS = java.util.Set.of(
            AWS_SES_REGION, AWS_SES_FROM_EMAIL, AWS_SNS_REGION,
            AWS_SNS_SENDER_ID, GOOGLE_CLIENT_ID, RECAPTCHA_SITE_KEY
    );

    private final IntegrationConfigRepository repository;
    private final CryptoService cryptoService;

    public IntegrationService(IntegrationConfigRepository repository, CryptoService cryptoService) {
        this.repository = repository;
        this.cryptoService = cryptoService;
    }

    /**
     * Returns status + masked preview for every known config key.
     * Never returns actual secret values.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStatus() {
        Map<String, IntegrationConfig> byKey = new HashMap<>();
        repository.findAll().forEach(cfg -> byKey.put(cfg.getKey(), cfg));

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (String key : knownKeys()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            IntegrationConfig cfg = byKey.get(key);
            boolean configured = cfg != null && cfg.isConfigured();
            entry.put("key", key);
            entry.put("isConfigured", configured);
            if (configured && cfg != null) {
                entry.put("maskedValue", mask(key, cfg.getEncryptedValue()));
            } else {
                entry.put("maskedValue", "");
            }
            result.add(entry);
        }
        return result;
    }

    @Transactional
    public void saveIntegration(String key, String value) {
        if (key == null || key.isBlank()) throw new IllegalArgumentException("Config key is required");
        if (!knownKeys().contains(key)) throw new IllegalArgumentException("Unknown config key: " + key);

        Optional<IntegrationConfig> existing = repository.findById(key);
        IntegrationConfig cfg = existing.orElseGet(() -> new IntegrationConfig(key, "", false));
        if (value == null || value.isBlank()) {
            // Clearing the value -> mark unconfigured (but keep old encrypted blob? no, remove)
            if (existing.isPresent()) {
                repository.deleteById(key);
            }
            return;
        }
        cfg.setEncryptedValue(encrypt(key, value));
        cfg.setConfigured(true);
        repository.save(cfg);
    }

    /**
     * Deletes a single stored secret (used by "Remove" button / after errors).
     */
    @Transactional
    public void deleteIntegration(String key) {
        if (key != null) repository.deleteById(key);
    }

    /**
     * Returns the decrypted secret value for internal services (SES/SNS/Razorpay).
     * Returns null if key not configured. For non-secret keys (region, from-email,
     * sender-id, google client id, recaptcha site key) the stored value is
     * base64-encoded — those are decoded and returned. NEVER expose secrets via controllers.
     */
    public String getSecret(String key) {
        if (!knownKeys().contains(key)) return null;
        return repository.findById(key)
                .filter(cfg -> cfg.isConfigured())
                .map(cfg -> cfg.getEncryptedValue())
                .map(encrypted -> {
                    if (PLAINTEXT_KEYS.contains(key)) {
                        return new String(java.util.Base64.getDecoder().decode(encrypted), java.nio.charset.StandardCharsets.UTF_8);
                    }
                    return cryptoService.decrypt(encrypted);
                })
                .orElse(null);
    }

    public boolean isConfigured(String key) {
        return repository.findById(key).map(cfg -> cfg.isConfigured()).orElse(false);
    }

    // ===== helpers =====

    private List<String> knownKeys() {
        return java.util.List.of(
                RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
                AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY, AWS_SES_REGION, AWS_SES_FROM_EMAIL,
                AWS_SNS_ACCESS_KEY, AWS_SNS_SECRET_KEY, AWS_SNS_REGION, AWS_SNS_SENDER_ID,
                GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
                RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY
        );
    }

    private String encrypt(String key, String value) {
        if (PLAINTEXT_KEYS.contains(key)) {
            // Non-secret values are base64-encoded (not AES) for compactness
            return java.util.Base64.getEncoder().encodeToString(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
        return cryptoService.encrypt(value);
    }

    private String mask(String key, String encryptedValue) {
        if (PLAINTEXT_KEYS.contains(key)) {
            return new String(java.util.Base64.getDecoder().decode(encryptedValue), java.nio.charset.StandardCharsets.UTF_8);
        }
        try {
            return cryptoService.maskValue(cryptoService.decrypt(encryptedValue));
        } catch (Exception e) {
            return "••••••••";
        }
    }
}