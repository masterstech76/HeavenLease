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
@Table(name = "leases")
public class Lease {

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
    private String startDate;

    @Column(nullable = false, length = 20)
    private String endDate;

    @Column(nullable = false)
    private Double monthlyRent;

    @Column(nullable = false)
    private Double deposit;

    @Column(length = 500)
    private String signatureTenant;

    @Column(length = 500)
    private String signatureOwner;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 200)
    private String propertyTitle;

    @Column(length = 100)
    private String tenantName;

    @Column(length = 100)
    private String ownerName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Lease() {
    }

    public Lease(Long id, Long propertyId, Long tenantId, Long ownerId, String startDate, String endDate, Double monthlyRent, Double deposit, String signatureTenant, String signatureOwner, String status, String propertyTitle, String tenantName, String ownerName, LocalDateTime createdAt) {
        this.id = id;
        this.propertyId = propertyId;
        this.tenantId = tenantId;
        this.ownerId = ownerId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.monthlyRent = monthlyRent;
        this.deposit = deposit;
        this.signatureTenant = signatureTenant;
        this.signatureOwner = signatureOwner;
        this.status = status;
        this.propertyTitle = propertyTitle;
        this.tenantName = tenantName;
        this.ownerName = ownerName;
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
    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
    public Double getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(Double monthlyRent) { this.monthlyRent = monthlyRent; }
    public Double getDeposit() { return deposit; }
    public void setDeposit(Double deposit) { this.deposit = deposit; }
    public String getSignatureTenant() { return signatureTenant; }
    public void setSignatureTenant(String signatureTenant) { this.signatureTenant = signatureTenant; }
    public String getSignatureOwner() { return signatureOwner; }
    public void setSignatureOwner(String signatureOwner) { this.signatureOwner = signatureOwner; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPropertyTitle() { return propertyTitle; }
    public void setPropertyTitle(String propertyTitle) { this.propertyTitle = propertyTitle; }
    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}