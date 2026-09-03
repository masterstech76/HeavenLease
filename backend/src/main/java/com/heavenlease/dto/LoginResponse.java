package com.heavenlease.dto;

public class LoginResponse {
    private String token;
    private String email;
    private String role;
    private Long id;
    private String fullName;

    public LoginResponse() {}
    public LoginResponse(String token, String email, String role, Long id, String fullName) {
        this.token = token; this.email = email; this.role = role; this.id = id; this.fullName = fullName;
    }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
}