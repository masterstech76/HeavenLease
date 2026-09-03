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
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // userId/propertyId/paymentType are nullable because plan subscription
    // purchases (e.g. Tenant Access Pass) have no property attached.
    @Column(nullable = true)
    private Long userId;

    @Column(nullable = true)
    private Long propertyId;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = true, length = 20)
    private String paymentType;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 100)
    private String transactionId;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private boolean active;

    /** True when the payment is an escrow deposit held by the platform. */
    @Column(nullable = false)
    private boolean escrow;

    /** Escrow recipient (the property owner) — resolved server-side. */
    @Column(nullable = true)
    private Long ownerId;

    /** Two-party release: tenant says the deposit may be released. */
    @Column(nullable = false)
    private boolean escrowTenantApproved;

    /** Two-party release: owner confirms the handover is complete. */
    @Column(nullable = false)
    private boolean escrowOwnerApproved;

    @Column(length = 500)
    private String escrowDisputeReason;

    @Column(length = 500)
    private String escrowResolutionNote;

    /** When the scheduled renewal reminder was last sent for this payment (null = never). */
    private java.time.LocalDateTime lastRenewalReminderAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Payment() {
    }

    public Payment(Long id, Long userId, Long propertyId, Double amount, String paymentType, String status, String transactionId, String description, boolean active, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.propertyId = propertyId;
        this.amount = amount;
        this.paymentType = paymentType;
        this.status = status;
        this.transactionId = transactionId;
        this.description = description;
        this.active = active;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getPropertyId() { return propertyId; }
    public void setPropertyId(Long propertyId) { this.propertyId = propertyId; }
    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isEscrow() { return escrow; }
    public void setEscrow(boolean escrow) { this.escrow = escrow; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public boolean isEscrowTenantApproved() { return escrowTenantApproved; }
    public void setEscrowTenantApproved(boolean escrowTenantApproved) { this.escrowTenantApproved = escrowTenantApproved; }
    public boolean isEscrowOwnerApproved() { return escrowOwnerApproved; }
    public void setEscrowOwnerApproved(boolean escrowOwnerApproved) { this.escrowOwnerApproved = escrowOwnerApproved; }
    public String getEscrowDisputeReason() { return escrowDisputeReason; }
    public void setEscrowDisputeReason(String escrowDisputeReason) { this.escrowDisputeReason = escrowDisputeReason; }
    public String getEscrowResolutionNote() { return escrowResolutionNote; }
    public void setEscrowResolutionNote(String escrowResolutionNote) { this.escrowResolutionNote = escrowResolutionNote; }
    public java.time.LocalDateTime getLastRenewalReminderAt() { return lastRenewalReminderAt; }
    public void setLastRenewalReminderAt(java.time.LocalDateTime lastRenewalReminderAt) { this.lastRenewalReminderAt = lastRenewalReminderAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}