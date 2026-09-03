package com.heavenlease.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.service.IntegrationService;

/**
 * Admin-only endpoints for configuring third-party integrations
 * (Razorpay, AWS SES, AWS SNS, Google, reCAPTCHA). Secrets are encrypted
 * at rest and never returned in full — only masked previews + isConfigured.
 */
@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private final IntegrationService integrationService;

    public IntegrationController(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getStatus() {
        List<Map<String, Object>> status = integrationService.getStatus();
        return ResponseEntity.ok(Map.of("integrations", status));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> save(@RequestBody Map<String, String> body) {
        String key = body.get("key");
        String value = body.get("value");
        try {
            integrationService.saveIntegration(key, value);
            return ResponseEntity.ok(Map.of("message", "Integration saved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save integration"));
        }
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable String key) {
        integrationService.deleteIntegration(key);
        return ResponseEntity.ok(Map.of("message", "Integration removed"));
    }
}