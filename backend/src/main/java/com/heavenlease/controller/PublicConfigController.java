package com.heavenlease.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.service.IntegrationService;

/**
 * Public, no-auth endpoint that exposes ONLY non-secret configuration
 * needed by the browser BEFORE login (reCAPTCHA site key, Google Client ID).
 * NEVER returns secrets.
 */
@RestController
@RequestMapping("/api/public")
public class PublicConfigController {

    private final IntegrationService integrationService;

    @Value("${app.google.client-id:}")
    private String googleClientIdFromConfig;

    @Value("${app.recaptcha.site-key:}")
    private String recaptchaSiteKeyFromConfig;

    @Value("${app.recaptcha.version:v3}")
    private String recaptchaVersionFromConfig;

    public PublicConfigController(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @GetMapping("/config")
    public ResponseEntity<?> getPublicConfig() {
        Map<String, Object> result = new LinkedHashMap<>();

        String googleClientId = integrationService.getSecret(IntegrationService.GOOGLE_CLIENT_ID);
        if (googleClientId == null || googleClientId.isBlank()) {
            googleClientId = googleClientIdFromConfig;
        }
        result.put("googleClientId", googleClientId != null ? googleClientId : "");

        String recaptchaSiteKey = integrationService.getSecret(IntegrationService.RECAPTCHA_SITE_KEY);
        if (recaptchaSiteKey == null || recaptchaSiteKey.isBlank()) {
            recaptchaSiteKey = recaptchaSiteKeyFromConfig;
        }
        result.put("recaptchaSiteKey", recaptchaSiteKey != null ? recaptchaSiteKey : "");

        // Which reCAPTCHA mode to use: "v2" renders a visible checkbox, any other
        // value (or unset) uses invisible v3. Set via .env RECAPTCHA_VERSION.
        result.put("recaptchaVersion", recaptchaVersionFromConfig);

        return ResponseEntity.ok(result);
    }
}