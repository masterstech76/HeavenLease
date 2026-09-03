package com.heavenlease.repository;

import com.heavenlease.model.DocumentUpload;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface DocumentUploadRepository extends JpaRepository<DocumentUpload, Long> {
    List<DocumentUpload> findByUserId(Long userId);
    List<DocumentUpload> findByPageKey(String pageKey);
    List<DocumentUpload> findByUserIdAndPageKey(Long userId, String pageKey);
    List<DocumentUpload> findByStatus(String status);
    List<DocumentUpload> findByPageKeyAndStatus(String pageKey, String status);
    List<DocumentUpload> findByPropertyId(Long propertyId);
    List<DocumentUpload> findByPropertyIdIn(Collection<Long> propertyIds);
    long countByUserIdAndStatus(Long userId, String status);
}