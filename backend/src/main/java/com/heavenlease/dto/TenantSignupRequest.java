package com.heavenlease.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class TenantSignupRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "Password is required")
    private String password;

    // Role the user selected at signup: "TENANT" (default) or "OWNER".
    // The backend's safeRole() only ever accepts these two — ADMIN and
    // VERIFIED_OWNER are granted exclusively server-side by an admin.
    private String role;

    // Optional 6-digit OTP obtained from /send-signup-code. When present and valid,
    // the account is created already email-verified.
    private String code;

    // Optional reCAPTCHA token, enforced server-side when a reCAPTCHA secret is set.
    private String captchaToken;

    public TenantSignupRequest() {}

    public TenantSignupRequest(String fullName, String email, String phone, String password, String role, String code) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.role = role;
        this.code = code;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getCaptchaToken() { return captchaToken; }
    public void setCaptchaToken(String captchaToken) { this.captchaToken = captchaToken; }
}