package com.heavenlease.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;

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

    private final DocumentUploadRepository documentRepository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationRepository notificationRepository;

    public DocumentController(DocumentUploadRepository documentRepository,
                              UserRepository userRepository,
                              PropertyRepository propertyRepository,
                              NotificationRepository notificationRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.notificationRepository = notificationRepository;
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
        if (pageKey == null || pageKey.isBlank() || !ALLOWED_PAGE_KEYS.contains(pageKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown feature page"));
        }
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        // SECURITY: if a propertyId is attached, it must be a property the current
        // user owns (or ADMIN). This links the document to the right reviewer and
        // stops documents being attached to another owner's property.
        if (propertyId != null && !CurrentUser.isAdmin()) {
            boolean owns = propertyRepository.findById(propertyId)
                    .map(p -> p.getOwnerId() != null && p.getOwnerId().equals(userId))
                    .orElse(false);
            if (!owns) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only upload documents against your own properties"));
            }
        }

        // Limit file type — only PDF and images are accepted.
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        boolean allowedType = contentType.equals("application/pdf")
                || contentType.startsWith("image/");
        if (!allowedType) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only PDF or image files (JPG/PNG) are allowed"));
        }

        try {
            String uploadDir = System.getenv().getOrDefault("UPLOAD_DIR", "./uploads");
            java.io.File dir = new java.io.File(uploadDir, "documents");
            if (!dir.exists() && !dir.mkdirs()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Could not create upload directory"));
            }
            String safeExt = "pdf";
            if (contentType.startsWith("image/")) {
                safeExt = contentType.replace("image/", "");
                if (safeExt.equals("jpeg")) safeExt = "jpg";
                if (!safeExt.matches("(png|jpg|gif|webp)")) safeExt = "jpg";
            }
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
            Long reviewerId = docOwnerIdForNotification();
            if (reviewerId != null && !reviewerId.equals(userId)) {
                notifyUser(reviewerId, "New document awaiting review",
                        "A tenant uploaded \"" + doc.getFileName() + "\" on the " + pageKey + " feature page. Review it now to verify or reject.");
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "id", doc.getId(),
                    "fileUrl", fileUrl,
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
    public ResponseEntity<?> received() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        // SECURITY (IDOR): an owner may only see documents explicitly linked to
        // properties they own (or their own uploads). This prevents any owner from
        // reading every tenant's PII documents.
        List<Property> owned = propertyRepository.findByOwnerId(userId);
        List<DocumentUpload> docs = new java.util.ArrayList<>();
        if (CurrentUser.isAdmin()) {
            docs.addAll(documentRepository.findAll());
        } else {
            if (!owned.isEmpty()) {
                List<Long> ownedIds = owned.stream().map(Property::getId).toList();
                docs.addAll(documentRepository.findByPropertyIdIn(ownedIds));
            }
            // The owner's own uploads are always visible to them.
            documentRepository.findByUserId(userId).forEach(doc -> {
                if (!docs.contains(doc)) docs.add(doc);
            });
        }
        return ResponseEntity.ok(docs);
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
        // Only owners or admins may verify documents.
        if (!CurrentUser.isAdmin()) {
            User reviewer = userRepository.findById(CurrentUser.getId()).orElse(null);
            if (reviewer == null || reviewer.getRole() == User.Role.TENANT) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only owners or admins can verify documents"));
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
        documentRepository.delete(doc);
        return ResponseEntity.ok(Map.of("message", "Document deleted"));
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

    /** Resolves a reviewer (a verified owner, else the first owner, else an admin) to notify. */
    private Long docOwnerIdForNotification() {
        try {
            var owners = userRepository.findByRole(User.Role.VERIFIED_OWNER);
            if (owners != null && !owners.isEmpty()) return owners.get(0).getId();
            owners = userRepository.findByRole(User.Role.OWNER);
            if (owners != null && !owners.isEmpty()) return owners.get(0).getId();
            var admins = userRepository.findByRole(User.Role.ADMIN);
            if (admins != null && !admins.isEmpty()) return admins.get(0).getId();
        } catch (Exception ignored) {
            // Fall through.
        }
        return null;
    }
}