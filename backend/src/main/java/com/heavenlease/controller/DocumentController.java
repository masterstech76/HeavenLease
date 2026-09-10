package com.heavenlease.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.heavenlease.model.DocumentUpload;
import com.heavenlease.model.Notification;
import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.DocumentUploadRepository;
import com.heavenlease.repository.NotificationRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.BookingRepository;
import com.heavenlease.repository.LeaseRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;
import com.heavenlease.service.DocumentStorageService;

/**
 * Tenant/Owner document exchange per feature page.
 *
 * Routes:
 *   POST   /api/documents/upload         (tenant/owner upload, multipart)
 *   GET    /api/documents/mine           (my uploads)
 *   GET    /api/documents/page/{pageKey} (all uploads for a feature page)
 *   GET    /api/documents/received       (owner: uploads tied to their properties)
 *   PUT    /api/documents/{id}/status    (owner/admin: VERIFY or REJECT)
 *   DELETE /api/documents/{id}           (owner of the doc, or admin)
 */
@RestController
@RequestMapping("/api/documents")
@PreAuthorize("isAuthenticated()")
@SuppressWarnings("null")
public class DocumentController {

    private static final java.util.Set<String> ALLOWED_STATUSES =
            java.util.Set.of("PENDING", "VERIFIED", "REJECTED");

    /** Page keys that any authenticated user may upload to. */
    private static final java.util.Set<String> ALLOWED_PAGE_KEYS = java.util.Set.of(
            "background_check", "comfort_feedback", "community", "credit_report",
            "employment", "rent_fairness", "identity", "lease_templates",
            "heavenlease_all", "maintenance", "no_broker", "owner_guides",
            "owner_support", "rent_pricing", "rental_history", "speed_kyc",
            "tax", "trust_safety", "possession", "tenant_screening",
            "lease_signing", "owner_resources", "buy_sell"
    );

    /** Overridable upload root — see other controllers for why this must be absolute. */
    @Value("${app.upload-dir}")
    private String uploadDir;

    private final DocumentUploadRepository documentRepository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;
    private final LeaseRepository leaseRepository;
    private final NotificationRepository notificationRepository;
    private final DocumentStorageService storageService;

    public DocumentController(DocumentUploadRepository documentRepository,
                              UserRepository userRepository,
                              PropertyRepository propertyRepository,
                              BookingRepository bookingRepository,
                              LeaseRepository leaseRepository,
                              NotificationRepository notificationRepository,
                              DocumentStorageService storageService) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
        this.leaseRepository = leaseRepository;
        this.notificationRepository = notificationRepository;
        this.storageService = storageService;
    }
@PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam("pageKey") String pageKey,
                                    @RequestParam(value = "docType", required = false) String docType,
                                    @RequestParam(value = "meta", required = false) String meta,
                                    @RequestParam(value = "propertyId", required = false) Long propertyId) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file selected"));
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", "File must be 5 MB or smaller"));
        }
        if (pageKey == null || pageKey.isBlank() || !ALLOWED_PAGE_KEYS.contains(pageKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown feature page"));
        }
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        // SECURITY: a property link must belong to the authenticated user's
        // legitimate owner/tenant relationship. Never trust propertyId by itself.
        if (propertyId != null && !CurrentUser.isAdmin()) {
            Property property = propertyRepository.findById(propertyId).orElse(null);
            if (property == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Property not found"));
            }
            boolean owner = userId.equals(property.getOwnerId());
            boolean tenant = bookingRepository.findByTenantIdAndPropertyId(userId, propertyId).stream()
                    .anyMatch(b -> "approved".equalsIgnoreCase(b.getStatus())
                            || "confirmed".equalsIgnoreCase(b.getStatus()));
            if (!tenant) {
                tenant = leaseRepository.findByTenantIdAndPropertyId(userId, propertyId).stream()
                        .anyMatch(l -> "active".equalsIgnoreCase(l.getStatus())
                                || "signed".equalsIgnoreCase(l.getStatus()));
            }
            if (!owner && !tenant) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You are not authorized to attach a document to this property"));
            }
        }

        // Do not trust Content-Type, extension, or filename. Only PDF/JPEG/PNG
        // signatures are accepted and image files must decode successfully.
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        originalName = originalName.replaceAll("[\\\\/\\r\\n\\\"<>]", "_");
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        byte[] header;
        try {
            header = file.getBytes();
        } catch (java.io.IOException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Could not read the uploaded file"));
        }
        boolean pdf = header.length >= 5
                && header[0] == '%' && header[1] == 'P' && header[2] == 'D' && header[3] == 'F' && header[4] == '-';
        boolean jpeg = header.length >= 3
                && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff;
        boolean png = header.length >= 8
                && (header[0] & 0xff) == 0x89 && header[1] == 0x50 && header[2] == 0x4e
                && header[3] == 0x47 && header[4] == 0x0d && header[5] == 0x0a
                && header[6] == 0x1a && header[7] == 0x0a;
        boolean declaredTypeMatches = (pdf && "application/pdf".equalsIgnoreCase(contentType))
                || (jpeg && "image/jpeg".equalsIgnoreCase(contentType))
                || (png && "image/png".equalsIgnoreCase(contentType));
        if (!declaredTypeMatches) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only valid PDF, JPG or PNG files are allowed"));
        }
        if ((jpeg || png) && !isDecodableImage(header)) {
            return ResponseEntity.badRequest().body(Map.of("error", "The uploaded image could not be decoded"));
        }

        try {
            java.io.File dir = new java.io.File(uploadDir, "documents");
            if (!dir.exists() && !dir.mkdirs()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Could not create upload directory"));
            }
            String safeExt = pdf ? "pdf" : (png ? "png" : "jpg");
            String filename = "doc_" + java.util.UUID.randomUUID().toString().substring(0, 10) + "." + safeExt;
            java.io.File target = new java.io.File(dir, filename);
            file.transferTo(target);
            String fileUrl = "/uploads/documents/" + filename;

            // Mask any user-provided sensitive values (Aadhaar / PAN) before storing.
            String masked = maskSensitive(meta);

            DocumentUpload doc = new DocumentUpload();
            doc.setUserId(userId);
            doc.setPropertyId(propertyId);
            doc.setPageKey(pageKey);
            doc.setDocType(docType != null && !docType.isBlank() ? docType : "document");
            doc.setFileUrl(fileUrl);
            doc.setFileName(originalName);
            doc.setMimeType(contentType);
            doc.setStatus("PENDING");
            doc.setMaskedValues(masked);
            documentRepository.save(doc);

            // Notify a reviewer that a new document is pending review.
            Long reviewerId = reviewerIdFor(doc.getPropertyId(), userId);
            if (reviewerId != null && !reviewerId.equals(userId)) {
                notifyUser(reviewerId, "New document awaiting review",
                        "A document was submitted on the " + pageKey + " feature page. Review it now.");
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "id", doc.getId(),
                    "fileUrl", "/api/documents/" + doc.getId() + "/download",
                    "fileName", originalName,
                    "status", doc.getStatus(),
                    "maskedValues", doc.getMaskedValues(),
                    "message", "Document uploaded. It is now PENDING review."
            ));
        } catch (java.io.IOException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        List<DocumentUpload> docs = documentRepository.findByUserId(userId);
        docs.sort(java.util.Comparator.comparing(DocumentUpload::getCreatedAt).reversed());
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/page/{pageKey}")
    public ResponseEntity<?> byPage(@PathVariable String pageKey) {
        if (pageKey == null || !ALLOWED_PAGE_KEYS.contains(pageKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown feature page"));
        }
        // SECURITY (IDOR): a user may only ever see their OWN documents for a
        // feature page. Returning everyone's uploads here would leak Aadhaar/income
        // files to any authenticated user. Only ADMIN can review across users.
        List<DocumentUpload> docs = CurrentUser.isAdmin()
                ? documentRepository.findByPageKey(pageKey)
                : documentRepository.findByUserIdAndPageKey(CurrentUser.getId(), pageKey);
        docs.sort(java.util.Comparator.comparing(DocumentUpload::getCreatedAt).reversed());
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/received")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> received() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        if (CurrentUser.isAdmin()) return ResponseEntity.ok(documentRepository.findAll());

        List<Property> owned = propertyRepository.findByOwnerId(userId);
        List<DocumentUpload> docs = new java.util.ArrayList<>(documentRepository.findByUserId(userId));
        if (!owned.isEmpty()) {
            List<Long> ownedIds = owned.stream().map(Property::getId).toList();
            documentRepository.findByPropertyIdIn(ownedIds).forEach(doc -> {
                if (!docs.contains(doc)) docs.add(doc);
            });
        }
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> download(@PathVariable Long id) {
        Optional<DocumentUpload> existing = documentRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();

        DocumentUpload doc = existing.get();
        Long userId = CurrentUser.getId();
        boolean allowed = CurrentUser.isAdmin() || (userId != null && userId.equals(doc.getUserId()));
        if (!allowed && userId != null && doc.getPropertyId() != null) {
            allowed = propertyRepository.findById(doc.getPropertyId())
                    .map(p -> userId.equals(p.getOwnerId()))
                    .orElse(false);
        }
        if (!allowed) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        java.nio.file.Path path = storageService.resolve(doc.getFileUrl());
        if (path == null || !java.nio.file.Files.isRegularFile(path)) return ResponseEntity.notFound().build();

        Resource resource = new FileSystemResource(path);
        String filename = doc.getFileName() == null || doc.getFileName().isBlank()
                ? "document" : doc.getFileName().replaceAll("[\\\\/\\r\\n\\\"<>]", "_");
        org.springframework.http.MediaType mediaType;
        try {
            mediaType = org.springframework.http.MediaType.parseMediaType(
                    doc.getMimeType() == null || doc.getMimeType().isBlank()
                            ? "application/octet-stream" : doc.getMimeType());
        } catch (IllegalArgumentException ex) {
            mediaType = org.springframework.http.MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .contentType(mediaType)
                .body(resource);
    }


@PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || !ALLOWED_STATUSES.contains(status.toUpperCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status must be PENDING, VERIFIED or REJECTED"));
        }
        Optional<DocumentUpload> existing = documentRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DocumentUpload doc = existing.get();
        // Only the owner of the linked property (or an admin) may review.
        if (!CurrentUser.isAdmin()) {
            Long reviewerId = CurrentUser.getId();
            boolean authorized = doc.getPropertyId() != null
                    && propertyRepository.findById(doc.getPropertyId())
                            .map(p -> reviewerId != null && reviewerId.equals(p.getOwnerId()))
                            .orElse(false);
            if (!authorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only the linked property owner can verify this document"));
            }
        }
        doc.setStatus(status.toUpperCase());
        doc.setReviewNote(body.get("reviewNote"));
        doc.setReviewedBy(CurrentUser.getId());
        documentRepository.save(doc);

        // Notify the uploading user that their document was reviewed.
        if (doc.getUserId() != null && !doc.getUserId().equals(CurrentUser.getId())) {
            notifyUser(doc.getUserId(), "Your document was " + doc.getStatus(),
                    "\"" + doc.getFileName() + "\" has been marked " + doc.getStatus()
                            + (doc.getReviewNote() != null && !doc.getReviewNote().isBlank()
                            ? " — " + doc.getReviewNote() : "") + ".");
        }

        return ResponseEntity.ok(Map.of(
                "id", doc.getId(),
                "status", doc.getStatus(),
                "reviewNote", doc.getReviewNote() == null ? "" : doc.getReviewNote()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<DocumentUpload> existing = documentRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DocumentUpload doc = existing.get();
        Long currentId = CurrentUser.getId();
        if (!CurrentUser.isAdmin()
                && (doc.getUserId() == null || !doc.getUserId().equals(currentId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only delete your own documents"));
        }
        storageService.delete(doc);
        documentRepository.delete(doc);
        return ResponseEntity.ok(Map.of("message", "Document deleted"));
    }

    /**
     * Attempts to decode JPEG/PNG bytes via ImageIO. Returns false when the
     * bytes are not a decodable image (also covers ImageIO.Exception, which is
     * thrown for truncated/corrupt data). PDFs are accepted without this check.
     */
    private boolean isDecodableImage(byte[] data) {
        try {
            return javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(data)) != null;
        } catch (java.io.IOException ex) {
            return false;
        }
    }

    /** Masks Aadhaar (12-digit) and PAN strings if detected in meta. */
    private String maskSensitive(String meta) {
        if (meta == null || meta.isBlank()) {
            return "";
        }
        String value = meta.trim();
        String masked = value;
        // Aadhaar: 12 consecutive digits -> mask the middle 8 digits.
        masked = masked.replaceAll("(?<!\\d)(\\d{4})(\\d{8})(?!\\d)", "$1XXXXXXXX");
        // PAN: 5 letters + 4 digits + 1 letter -> mask the middle.
        masked = masked.replaceAll("(?i)([A-Z]{5})(\\d{4})([A-Z])", "$1XXXX$3");
        return masked.equals(value) ? "" : masked;
    }

    /** Creates an in-app notification for a user. */
    private void notifyUser(Long userId, String title, String message) {
        try {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setTitle(title);
            n.setMessage(message);
            n.setType("DOCUMENT");
            n.setRead(false);
            notificationRepository.save(n);
        } catch (Exception ignored) {
            // Notifications must never block the document flow.
        }
    }

    /** Resolves only an actually authorized reviewer for this document. */
    private Long reviewerIdFor(Long propertyId, Long uploaderId) {
        try {
            if (propertyId != null) {
                return propertyRepository.findById(propertyId)
                        .map(Property::getOwnerId)
                        .filter(id -> id != null && !id.equals(uploaderId))
                        .orElse(null);
            }
            var admins = userRepository.findByRole(User.Role.ADMIN);
            if (admins != null && !admins.isEmpty()) return admins.get(0).getId();
        } catch (Exception ignored) {
            // Notification failure must never block document upload.
        }
        return null;
    }
}