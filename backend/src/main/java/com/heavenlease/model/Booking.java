package com.heavenlease.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propertyId;

    @Column(nullable = false)
    private Long tenantId;

    @Column(nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 20)
    private String tourDate;

    @Column(nullable = false, length = 10)
    private String tourTime;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 500)
    private String message;

    @Column(nullable = false, length = 100)
    private String tenantName;

    @Column(nullable = false, length = 20)
    private String tenantPhone;

    @Column(length = 200)
    private String propertyTitle;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Booking() {
    }

    public Booking(Long id, Long propertyId, Long tenantId, Long ownerId, String tourDate, String tourTime, String status, String message, String tenantName, String tenantPhone, String propertyTitle, LocalDateTime createdAt) {
        this.id = id;
        this.propertyId = propertyId;
        this.tenantId = tenantId;
        this.ownerId = ownerId;
        this.tourDate = tourDate;
        this.tourTime = tourTime;
        this.status = status;
        this.message = message;
        this.tenantName = tenantName;
        this.tenantPhone = tenantPhone;
        this.propertyTitle = propertyTitle;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPropertyId() { return propertyId; }
    public void setPropertyId(Long propertyId) { this.propertyId = propertyId; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public String getTourDate() { return tourDate; }
    public void setTourDate(String tourDate) { this.tourDate = tourDate; }
    public String getTourTime() { return tourTime; }
    public void setTourTime(String tourTime) { this.tourTime = tourTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }
    public String getTenantPhone() { return tenantPhone; }
    public void setTenantPhone(String tenantPhone) { this.tenantPhone = tenantPhone; }
    public String getPropertyTitle() { return propertyTitle; }
    public void setPropertyTitle(String propertyTitle) { this.propertyTitle = propertyTitle; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}