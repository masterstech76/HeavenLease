package com.heavenlease.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Stores encrypted third-party integration credentials (Razorpay, AWS SES,
 * AWS SNS, Google, reCAPTCHA) configured by the ADMIN in the Integration
 * Settings page. Secrets are AES-256-GCM encrypted at rest and never returned
 * in full via the API — only {isConfigured} flags + masked previews.
 */
@Entity
@Table(name = "integration_configs")
public class IntegrationConfig {

    @Id
    @Column(name = "config_key", length = 50)
    @JsonProperty("key")
    private String key; // e.g. "razorpay_key_id", "aws_ses_secret_key", "recaptcha_site_key"

    @JsonIgnore
    @Column(name = "encrypted_value", length = 2000, nullable = false)
    private String encryptedValue;

    @Column(name = "is_configured", nullable = false)
    @JsonProperty("isConfigured")
    private boolean isConfigured;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    @JsonIgnore
    private LocalDateTime updatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonIgnore
    private LocalDateTime createdAt;

    public IntegrationConfig() {
    }

    public IntegrationConfig(String key, String encryptedValue, boolean isConfigured) {
        this.key = key;
        this.encryptedValue = encryptedValue;
        this.isConfigured = isConfigured;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getEncryptedValue() { return encryptedValue; }
    public void setEncryptedValue(String encryptedValue) { this.encryptedValue = encryptedValue; }
    public boolean isConfigured() { return isConfigured; }
    public void setConfigured(boolean configured) { isConfigured = configured; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}