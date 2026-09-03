package com.heavenlease.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A document uploaded by a tenant/owner on a feature page.
 * Status lifecycle: PENDING -> VERIFIED | REJECTED.
 */
@Entity
@Table(name = "document_uploads")
public class DocumentUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    /** Optional property the document is linked to (used for owner review scoping). */
    @Column(nullable = true)
    private Long propertyId;

    /** Feature page key, e.g. "background_check", "identity", "rental_history". */
    @Column(nullable = false, length = 50)
    private String pageKey;

    @Column(nullable = false, length = 100)
    private String docType;

    @Column(nullable = false, length = 1000)
    private String fileUrl;

    @Column(nullable = false, length = 255)
    private String fileName = "";

    @Column(nullable = false, length = 100)
    private String mimeType = "";

    /** PENDING / VERIFIED / REJECTED. */
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    /** Sensitive values (Aadhaar etc.) masked server-side before storage. */
    @Column(nullable = false, length = 500)
    private String maskedValues = "";

    @Column(length = 500)
    private String reviewNote;

    private Long reviewedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public DocumentUpload() {}

    public DocumentUpload(Long id, Long userId, String pageKey, String docType, String fileUrl,
                          String fileName, String mimeType, String status, String maskedValues,
                          String reviewNote, Long reviewedBy, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.pageKey = pageKey;
        this.docType = docType;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.status = status;
        this.maskedValues = maskedValues;
        this.reviewNote = reviewNote;
        this.reviewedBy = reviewedBy;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getPropertyId() { return propertyId; }
    public void setPropertyId(Long propertyId) { this.propertyId = propertyId; }
    public String getPageKey() { return pageKey; }
    public void setPageKey(String pageKey) { this.pageKey = pageKey; }
    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMaskedValues() { return maskedValues; }
    public void setMaskedValues(String maskedValues) { this.maskedValues = maskedValues; }
    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }
    public Long getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(Long reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}