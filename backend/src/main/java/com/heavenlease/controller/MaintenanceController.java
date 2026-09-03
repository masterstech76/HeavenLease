package com.heavenlease.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.MaintenanceRequest;
import com.heavenlease.model.Property;
import com.heavenlease.repository.MaintenanceRequestRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.security.CurrentUser;
import com.heavenlease.service.NotificationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/maintenance")
@SuppressWarnings("null")
public class MaintenanceController {

    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;

    public MaintenanceController(MaintenanceRequestRepository maintenanceRequestRepository,
                                 PropertyRepository propertyRepository,
                                 NotificationService notificationService) {
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.propertyRepository = propertyRepository;
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(maintenanceRequestRepository.findAll());
    }

    /** Requests where the authenticated user is the tenant OR the owner. */
    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMine() {
        Long userId = CurrentUser.getId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (CurrentUser.isAdmin()) return ResponseEntity.ok(maintenanceRequestRepository.findAll());
        var tenants = maintenanceRequestRepository.findByTenantId(userId);
        var owned = maintenanceRequestRepository.findByOwnerId(userId);
        tenants.addAll(owned);
        return ResponseEntity.ok(tenants);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Optional<MaintenanceRequest> existing = maintenanceRequestRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        MaintenanceRequest r = existing.get();
        Long userId = CurrentUser.getId();
        boolean isParty = (userId != null)
                && (r.getTenantId().equals(userId) || r.getOwnerId().equals(userId));
        if (!CurrentUser.isAdmin() && !isParty) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(r);
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getByTenant(@PathVariable Long tenantId) {
        Long userId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (userId == null || !tenantId.equals(userId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(maintenanceRequestRepository.findByTenantId(tenantId));
    }

    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> getByOwner(@PathVariable Long ownerId) {
        Long userId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (userId == null || !ownerId.equals(userId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(maintenanceRequestRepository.findByOwnerId(ownerId));
    }

    @GetMapping("/property/{propertyId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getByProperty(@PathVariable Long propertyId) {
        Optional<Property> property = propertyRepository.findById(propertyId);
        if (property.isEmpty()) return ResponseEntity.notFound().build();
        Long userId = CurrentUser.getId();
        boolean isOwner = property.get().getOwnerId() != null
                && property.get().getOwnerId().equals(userId);
        if (!CurrentUser.isAdmin() && !isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only the property owner can view its maintenance requests"));
        }
        return ResponseEntity.ok(maintenanceRequestRepository.findByPropertyId(propertyId));
    }

    /**
     * Creates a maintenance request. The owner is ALWAYS resolved server-side
     * from the property — a client can never redirect a request to another owner.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> create(@Valid @RequestBody MaintenanceRequest request) {
        Long tenantId = CurrentUser.getId();
        if (tenantId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if (request.getSubject() == null || request.getSubject().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Subject is required"));
        }
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Description is required"));
        }
        if (request.getCategory() == null || request.getCategory().isBlank()) {
            request.setCategory("OTHER");
        }
        if (request.getPriority() == null || request.getPriority().isBlank()) {
            request.setPriority("NORMAL");
        }
        // Resolve the owner + property title from the Property row (authoritative).
        if (request.getPropertyId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Select the property you're reporting (from your bookings)"));
        }
        Optional<Property> property = propertyRepository.findById(request.getPropertyId());
        if (property.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Property not found"));
        }
        Property p = property.get();
        if (p.getOwnerId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "This property has no owner on record"));
        }

        request.setId(null);
        request.setTenantId(tenantId);
        request.setOwnerId(p.getOwnerId());
        request.setStatus("OPEN");
        request.setPropertyTitle(p.getTitle());
        if (request.getTenantName() == null || request.getTenantName().isBlank()) {
            request.setTenantName("Tenant #" + tenantId);
        }

        MaintenanceRequest saved = maintenanceRequestRepository.save(request);

        // Notify the owner — "MAINTENANCE" type (in-app bell).
        notificationService.notify(
                p.getOwnerId(),
                "New Maintenance Request",
                saved.getSubject() + " (" + saved.getCategory() + ", priority " + saved.getPriority() + ")",
                "MAINTENANCE");

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Owner/admin advances the request: OPEN -> IN_PROGRESS -> DONE (or CANCELLED). */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<MaintenanceRequest> existing = maintenanceRequestRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        MaintenanceRequest r = existing.get();

        Long userId = CurrentUser.getId();
        boolean isOwner = r.getOwnerId() != null && r.getOwnerId().equals(userId);
        if (!isOwner && !CurrentUser.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only the property owner can update this request"));
        }

        String status = body.getOrDefault("status", r.getStatus());
        boolean allowed = java.util.List.of("OPEN", "IN_PROGRESS", "DONE", "CANCELLED").stream()
                .anyMatch(s -> s.equalsIgnoreCase(status));
        if (!allowed) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status"));
        }
        r.setStatus(status.toUpperCase());
        if (body.containsKey("resolutionNote")) {
            String note = body.get("resolutionNote");
            r.setResolutionNote(note == null ? null : note.trim());
        }
        MaintenanceRequest saved = maintenanceRequestRepository.save(r);

        // Notify the tenant that their request moved.
        notificationService.notify(
                r.getTenantId(),
                "Maintenance Update",
                "\"" + r.getSubject() + "\" is now " + saved.getStatus() + ".",
                "MAINTENANCE");

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (maintenanceRequestRepository.existsById(id)) {
            maintenanceRequestRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Maintenance request deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}