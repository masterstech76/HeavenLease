package com.heavenlease.dto;

import jakarta.validation.constraints.NotBlank;

public class GoogleLoginRequest {

    @NotBlank(message = "ID token is required")
    private String idToken;

    // Optional role for NEW Google accounts (TENANT or OWNER).
    // NEVER trusted for existing accounts — their stored role is used.
    private String role;

    public GoogleLoginRequest() {}

    public String getIdToken() { return idToken; }
    public void setIdToken(String idToken) { this.idToken = idToken; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}