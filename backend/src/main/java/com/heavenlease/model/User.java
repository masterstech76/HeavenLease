package com.heavenlease.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean verified;

    @Column(length = 100, unique = true)
    private String googleId;

    @Column(length = 500)
    private String idDocUrl;

    @Column(length = 50)
    private String propertyCount;

    @Column(length = 50)
    private String ownerPlan;

    /** Instagram-style profile fields. */
    @Column(length = 30, unique = true)
    private String username;

    @Column(length = 300)
    private String bio;

    @Column(length = 500)
    private String avatarUrl;

    @Column(length = 120)
    private String website;

    @Column(length = 20)
    private String gender;

    @Column(nullable = false)
    private boolean deactivated;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum Role {
        TENANT,
        OWNER,
        VERIFIED_OWNER,
        ADMIN
    }

    public User() {
    }

    public User(Long id, String email, String fullName, String phone, String passwordHash, Role role, boolean verified, String googleId, String idDocUrl, String propertyCount, String ownerPlan, String username, String bio, String avatarUrl, String website, String gender, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.role = role;
        this.verified = verified;
        this.googleId = googleId;
        this.idDocUrl = idDocUrl;
        this.propertyCount = propertyCount;
        this.ownerPlan = ownerPlan;
        this.username = username;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.website = website;
        this.gender = gender;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }
    public String getIdDocUrl() { return idDocUrl; }
    public void setIdDocUrl(String idDocUrl) { this.idDocUrl = idDocUrl; }
    public String getPropertyCount() { return propertyCount; }
    public void setPropertyCount(String propertyCount) { this.propertyCount = propertyCount; }
    public String getOwnerPlan() { return ownerPlan; }
    public void setOwnerPlan(String ownerPlan) { this.ownerPlan = ownerPlan; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public boolean isDeactivated() { return deactivated; }
    public void setDeactivated(boolean deactivated) { this.deactivated = deactivated; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}