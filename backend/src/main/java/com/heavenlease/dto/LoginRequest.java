package com.heavenlease.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    // Optional reCAPTCHA token. The backend calls ReCaptchaService.verify() and
    // the check is enforced whenever a reCAPTCHA secret is configured.
    private String captchaToken;

    public LoginRequest() {}
    public LoginRequest(String email, String password) { this.email = email; this.password = password; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getCaptchaToken() { return captchaToken; }
    public void setCaptchaToken(String captchaToken) { this.captchaToken = captchaToken; }
}