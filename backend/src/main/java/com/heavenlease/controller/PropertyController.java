package com.heavenlease.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

import com.heavenlease.model.Payment;
import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.PaymentRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;
import com.heavenlease.service.DynamoDBService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/properties")
@SuppressWarnings("null")
public class PropertyController {

    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final DynamoDBService dynamoDBService;

    public PropertyController(PropertyRepository propertyRepository,
                              UserRepository userRepository, PaymentRepository paymentRepository,
                              DynamoDBService dynamoDBService) {
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.dynamoDBService = dynamoDBService;
    }

    /**
     * Contact visibility — the paywall's server-side enforcement.
     * Owner contact details are masked for any viewer who is not the property
     * owner, not an ADMIN, and has no active paid subscription. The decision is
     * made here on the server from the payments table — the client never
     * decides, so the phone/email simply are not present in the response.
     */
    private boolean hasActiveSubscription() {
        Long userId = CurrentUser.getId();
        if (userId == null) return false;
        java.util.Optional<Payment> latest = paymentRepository.findFirstByUserIdAndActiveTrueOrderByCreatedAtDesc(userId);
        if (latest.isEmpty()) return false;
        Payment p = latest.get();
        Integer months = parsePlanMonths(p.getDescription());
        return months != null && p.getCreatedAt() != null
                && p.getCreatedAt().plusMonths(months).isAfter(java.time.LocalDateTime.now());
    }

    private Integer parsePlanMonths(String description) {
        if (description == null) return null;
        try {
            if (description.startsWith("plan:")) {
                return Integer.valueOf(description.replaceFirst("plan:(\\d+).*", "$1"));
            }
        } catch (NumberFormatException ignored) {
            // not a plan payment
        }
        return null;
    }

    private void applyContactVisibility(Property property) {
        if (property == null) return;
        if (CurrentUser.isAdmin()
                || (property.getOwnerId() != null && property.getOwnerId().equals(CurrentUser.getId()))
                || hasActiveSubscription()) {
            property.setContactLocked(false);
        } else {
            property.setOwnerPhone(null);
            property.setOwnerEmail(null);
            property.setContactLocked(true);
        }
    }

    private void applyContactVisibility(java.util.List<Property> properties) {
        if (properties == null) return;
        properties.forEach(this::applyContactVisibility);
    }

    @GetMapping
    public ResponseEntity<?> getAllProperties(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Property> properties = propertyRepository.findAll(pageable);
        properties.getContent().forEach(this::applyContactVisibility);
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchProperties(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String propertyType,
            @RequestParam(required = false) Double minRent,
            @RequestParam(required = false) Double maxRent,
            @RequestParam(required = false) Integer bhk,
            @RequestParam(required = false) Boolean petFriendly,
            @RequestParam(required = false) Boolean furnished,
            @RequestParam(required = false) Integer minQuietness,
            @RequestParam(required = false) Integer minSunlight,
            @RequestParam(required = false) Integer maxCommute,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Cap page size to prevent abuse
        int safeSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        Page<Property> properties = propertyRepository.searchProperties(
                status, city, propertyType, minRent, maxRent, bhk,
                petFriendly, furnished, minQuietness, minSunlight, maxCommute,
                pageable);
        properties.getContent().forEach(this::applyContactVisibility);
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProperty(@PathVariable Long id) {
        Optional<Property> existing = propertyRepository.findById(id);
        if (existing.isPresent()) {
            // Real engagement metric — tracked in AWS DynamoDB (high-speed counter)
            // and reflected back so the response always includes a live count.
            dynamoDBService.incrementPropertyViewCount(id);
            applyContactVisibility(existing.get());
            existing.get().setViewCount(dynamoDBService.getPropertyViewCount(id));
            return ResponseEntity.ok(existing.get());
        }
        return ResponseEntity.notFound().build();
    }

    // Allowed property statuses (whitelist — prevents arbitrary/garbage values)
    private static final java.util.Set<String> ALLOWED_STATUSES =
            java.util.Set.of("active", "inactive", "pending", "rented", "sold");

    private boolean isValidStatus(String status) {
        return status == null || ALLOWED_STATUSES.contains(status.toLowerCase());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createProperty(@Valid @RequestBody Property property) {
        // SECURITY: ownership is always the authenticated user (never client-supplied)
        property.setOwnerId(CurrentUser.getId());
        // Real feature: only verified owners may list properties
        Long ownerId = CurrentUser.getId();
        if (ownerId != null) {
            User owner = userRepository.findById(ownerId).orElse(null);
            if (owner == null || !owner.isVerified()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Please verify your email/phone before listing a property"));
            }
        }
        if (property.getStatus() == null) property.setStatus("active");
        if (!isValidStatus(property.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid property status"));
        }
        if (property.getIcon() == null) property.setIcon("fa-building");
        if (property.getBadge() == null) property.setBadge("Verified Owner");
        Property saved = propertyRepository.save(property);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> updateProperty(@PathVariable Long id, @Valid @RequestBody Property property) {
        Optional<Property> existing = propertyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        // Only the property owner (or ADMIN) may edit it
        if (!CurrentUser.isAdmin()
                && (existing.get().getOwnerId() == null || !existing.get().getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only edit your own properties"));
        }
        property.setId(existing.get().getId());
        property.setOwnerId(existing.get().getOwnerId()); // never let client change ownership
        if (!isValidStatus(property.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid property status"));
        }
        Property updated = propertyRepository.save(property);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> deleteProperty(@PathVariable Long id) {
        Optional<Property> existing = propertyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        if (!CurrentUser.isAdmin()
                && (existing.get().getOwnerId() == null || !existing.get().getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only delete your own properties"));
        }
        propertyRepository.delete(existing.get());
        return ResponseEntity.ok(Map.of("message", "Property deleted"));
    }

    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> getPropertiesByOwner(@PathVariable Long ownerId) {
        // Only the owner themselves (or ADMIN) may list their properties
        if (!CurrentUser.isAdmin() && !ownerId.equals(CurrentUser.getId())) {
            return ResponseEntity.notFound().build();
        }
        java.util.List<Property> properties = propertyRepository.findByOwnerId(ownerId);
        applyContactVisibility(properties);
        return ResponseEntity.ok(properties);
    }

    /**
     * Adds a photo URL to a property's photo gallery.
     * Only the property owner (or ADMIN) may add photos.
     */
    @PostMapping("/{id}/photos")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> addPhoto(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String photoUrl = body.get("photoUrl");
        if (photoUrl == null || photoUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "photoUrl is required"));
        }
        Optional<Property> existing = propertyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Property property = existing.get();
        // Only the property owner (or ADMIN) may add photos
        if (!CurrentUser.isAdmin()
                && (property.getOwnerId() == null || !property.getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only add photos to your own properties"));
        }
        if (property.getPhotos() == null) {
            property.setPhotos(new java.util.ArrayList<>());
        }
        property.getPhotos().add(photoUrl);
        Property saved = propertyRepository.save(property);
        return ResponseEntity.ok(Map.of("photos", saved.getPhotos()));
    }

    /**
     * Real photo upload: accepts a multipart image file, stores it on the server
     * under {@code upload-dir} and returns the public URL so the owner can attach
     * it to the property gallery. Only the property owner (or ADMIN) may upload.
     */
    @PostMapping("/{id}/photos/upload")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file selected"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed"));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image too large (max 5MB)"));
        }
        Optional<Property> existing = propertyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Property property = existing.get();
        if (!CurrentUser.isAdmin()
                && (property.getOwnerId() == null || !property.getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only upload photos to your own properties"));
        }
        try {
            String uploadDir = System.getenv().getOrDefault("UPLOAD_DIR", "./uploads");
            java.io.File dir = new java.io.File(uploadDir);
            if (!dir.exists() && !dir.mkdirs()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Could not create upload directory"));
            }
            String safeExtension = contentType.replace("image/", "");
            if (safeExtension.equals("jpeg")) safeExtension = "jpg";
            if (!safeExtension.matches("(png|jpg|jpeg|gif|webp)")) safeExtension = "jpg";
            String filename = "prop_" + id + "_" + java.util.UUID.randomUUID().toString().substring(0, 8) + "." + safeExtension;
            java.io.File target = new java.io.File(dir, filename);
            file.transferTo(target);
            String photoUrl = "/uploads/" + filename;
            if (property.getPhotos() == null) property.setPhotos(new java.util.ArrayList<>());
            property.getPhotos().add(photoUrl);
            Property saved = propertyRepository.save(property);
            return ResponseEntity.ok(Map.of("photoUrl", photoUrl, "photos", saved.getPhotos()));
        } catch (java.io.IOException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    /**
     * Removes a photo URL from a property's gallery.
     */
    @DeleteMapping("/{id}/photos")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> removePhoto(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String photoUrl = body.get("photoUrl");
        if (photoUrl == null || photoUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "photoUrl is required"));
        }
        Optional<Property> existing = propertyRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Property property = existing.get();
        if (!CurrentUser.isAdmin()
                && (property.getOwnerId() == null || !property.getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only remove photos from your own properties"));
        }
        if (property.getPhotos() != null) {
            property.getPhotos().remove(photoUrl);
        }
        Property saved = propertyRepository.save(property);
        return ResponseEntity.ok(Map.of("photos", saved.getPhotos()));
    }
}
