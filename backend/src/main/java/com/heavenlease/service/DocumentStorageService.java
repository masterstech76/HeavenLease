package com.heavenlease.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.heavenlease.model.DocumentUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Owns physical document storage. Database records and files are separate
 * resources, so all document lifecycle code goes through this service.
 */
@Service
public class DocumentStorageService {
    private static final Logger log = LoggerFactory.getLogger(DocumentStorageService.class);

    private final Path documentRoot;

    public DocumentStorageService(@Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.documentRoot = Paths.get(uploadDir, "documents").toAbsolutePath().normalize();
    }

    public void delete(DocumentUpload document) {
        if (document == null) return;
        Path path = resolve(document.getFileUrl());
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            // Deletion is idempotent and can be retried later; never expose the
            // physical path to the client.
            log.error("Failed to delete stored document id={}", document.getId(), e);
        }
    }

    public void deleteAll(List<DocumentUpload> documents) {
        if (documents == null) return;
        documents.forEach(this::delete);
    }

    public Path resolve(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return null;
        final String prefix = "/uploads/documents/";
        if (!fileUrl.startsWith(prefix)) return null;
        String relative = fileUrl.substring(prefix.length());
        if (relative.isBlank() || relative.contains("..") || relative.contains("\\")
                || relative.contains("/")) return null;
        Path path = documentRoot.resolve(relative).normalize();
        return path.startsWith(documentRoot) ? path : null;
    }
}
