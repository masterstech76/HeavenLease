package com.heavenlease.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Server-side Google reCAPTCHA verification.
 * When a RECAPTCHA_SECRET_KEY is configured (via env RECAPTCHA_SECRET_KEY or
 * Admin - Integrations) the token is validated against Google. If no key is
 * configured, the check is skipped so the flow works without external setup.
 */
@Service
public class ReCaptchaService {

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final IntegrationService integrationService;
    private final RestTemplate restTemplate;

    @Value("${app.recaptcha.secret-key:}")
    private String recaptchaSecretKeyFromConfig;

    public ReCaptchaService(IntegrationService integrationService) {
        this.integrationService = integrationService;
        this.restTemplate = new RestTemplate();
    }

    public boolean verify(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        String secret = getConfiguredSecretOrNull();
        if (secret == null || secret.isBlank()) {
            // No secret key -> reCAPTCHA is NOT enforced. The frontend only sends a
            // real token when a site key exists, so with no keys the flow is open.
            return true;
        }
        // SECURITY HARDENING: when a real secret IS configured, never trust the
        // mock tokens the frontend generated while no key was present.
        if (token.startsWith("mock-captcha-")) {
            return false;
        }
        try {
            String url = VERIFY_URL + "?secret=" + secret + "&response=" + token;
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> result = restTemplate.getForObject(url, java.util.Map.class);
            if (result == null) return false;
            Object success = result.get("success");
            return success != null && Boolean.parseBoolean(String.valueOf(success));
        } catch (RestClientException e) {
            return false;
        }
    }

    /**
     * Returns the effective reCAPTCHA secret (from Admin→Integrations or .env),
     * or null when not configured. Lets controllers decide whether enforcement
     * should be active without duplicating resolution logic.
     */
    public String getConfiguredSecretOrNull() {
        String secret = integrationService.getSecret(IntegrationService.RECAPTCHA_SECRET_KEY);
        boolean configured = integrationService.isConfigured(IntegrationService.RECAPTCHA_SECRET_KEY);
        if (secret == null || secret.isBlank()) {
            secret = recaptchaSecretKeyFromConfig;
            configured = secret != null && !secret.isBlank();
        }
        return configured ? secret : null;
    }
}