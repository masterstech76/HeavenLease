package com.heavenlease.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * Self-hosted phone OTP record (no external SMS gateway required).
 *
 * The 6-digit code is NEVER stored in plaintext — only a salted SHA-256 hash
 * is persisted. Each row carries its own salt, an expiry, a resend counter and
 * a verify-attempt counter so brute-force and resend-flooding are limited
 * server-side.
 */
@Entity
@Table(name = "phone_otps", indexes = {
        @Index(name = "idx_phone_otp_phone", columnList = "phone")
})
public class PhoneOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Normalized 10-digit phone (no +91 / spaces / dashes). */
    @Column(nullable = false, length = 20)
    private String phone;

    /** SHA-256(salt + code) — never the raw code. */
    @Column(nullable = false, length = 64)
    private String codeHash;

    /** Per-code random salt (hex). */
    @Column(nullable = false, length = 32)
    private String salt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private int resendCount = 0;

    @Column(nullable = false)
    private LocalDateTime lastResendAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PhoneOtp() {
    }

    public PhoneOtp(Long id, String phone, String codeHash, String salt, LocalDateTime expiresAt,
                    int attempts, int resendCount, LocalDateTime lastResendAt, LocalDateTime createdAt) {
        this.id = id;
        this.phone = phone;
        this.codeHash = codeHash;
        this.salt = salt;
        this.expiresAt = expiresAt;
        this.attempts = attempts;
        this.resendCount = resendCount;
        this.lastResendAt = lastResendAt;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCodeHash() { return codeHash; }
    public void setCodeHash(String codeHash) { this.codeHash = codeHash; }
    public String getSalt() { return salt; }
    public void setSalt(String salt) { this.salt = salt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public int getResendCount() { return resendCount; }
    public void setResendCount(int resendCount) { this.resendCount = resendCount; }
    public LocalDateTime getLastResendAt() { return lastResendAt; }
    public void setLastResendAt(LocalDateTime lastResendAt) { this.lastResendAt = lastResendAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}