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

import com.heavenlease.model.Lease;
import com.heavenlease.repository.LeaseRepository;
import com.heavenlease.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/leases")
@SuppressWarnings("null")
public class LeaseController {

    private final LeaseRepository leaseRepository;

    public LeaseController(LeaseRepository leaseRepository) {
        this.leaseRepository = leaseRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllLeases() {
        return ResponseEntity.ok(leaseRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getLease(@PathVariable Long id) {
        Optional<Lease> lease = leaseRepository.findById(id);
        if (lease.isEmpty()) return ResponseEntity.notFound().build();
        Lease l = lease.get();
        Long currentUserId = CurrentUser.getId();
        boolean isTenant = l.getTenantId() != null && l.getTenantId().equals(currentUserId);
        boolean isOwner = l.getOwnerId() != null && l.getOwnerId().equals(currentUserId);
        if (!CurrentUser.isAdmin() && !isTenant && !isOwner) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(l);
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getLeasesByTenant(@PathVariable Long tenantId) {
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || !tenantId.equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(leaseRepository.findByTenantId(tenantId));
    }

    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getLeasesByOwner(@PathVariable Long ownerId) {
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || !ownerId.equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(leaseRepository.findByOwnerId(ownerId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createLease(@Valid @RequestBody Lease lease) {
        // SECURITY: an owner creates leases for their own property; force ownerId
        Long currentUserId = CurrentUser.getId();
        boolean isOwner = CurrentUser.hasAnyRole("OWNER", "VERIFIED_OWNER", "ADMIN");
        if (currentUserId == null || !isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only owners can create leases"));
        }
        lease.setOwnerId(currentUserId);
        if (lease.getStatus() == null) lease.setStatus("active");
        Lease saved = leaseRepository.save(lease);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> updateLease(@PathVariable Long id, @Valid @RequestBody Lease lease) {
        Optional<Lease> existing = leaseRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        if (!CurrentUser.isAdmin()
                && (existing.get().getOwnerId() == null || !existing.get().getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.notFound().build();
        }
        lease.setId(existing.get().getId());
        lease.setOwnerId(existing.get().getOwnerId());
        return ResponseEntity.ok(leaseRepository.save(lease));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> updateLeaseStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Lease> existing = leaseRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        if (!CurrentUser.isAdmin()
                && (existing.get().getOwnerId() == null || !existing.get().getOwnerId().equals(CurrentUser.getId()))) {
            return ResponseEntity.notFound().build();
        }
        Lease lease = existing.get();
        lease.setStatus(body.getOrDefault("status", lease.getStatus()));
        return ResponseEntity.ok(leaseRepository.save(lease));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteLease(@PathVariable Long id) {
        Optional<Lease> existing = leaseRepository.findById(id);
        if (existing.isPresent()) {
            leaseRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Lease deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}