package com.heavenlease.controller;

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
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.OwnerApplication;
import com.heavenlease.model.User;
import com.heavenlease.repository.OwnerApplicationRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/owner-applications")
@SuppressWarnings("null")
public class OwnerApplicationController {

    private final OwnerApplicationRepository ownerApplicationRepository;
    private final UserRepository userRepository;

    public OwnerApplicationController(OwnerApplicationRepository ownerApplicationRepository,
                                      UserRepository userRepository) {
        this.ownerApplicationRepository = ownerApplicationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllOwnerApplications() {
        return ResponseEntity.ok(ownerApplicationRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getOwnerApplication(@PathVariable Long id) {
        Optional<OwnerApplication> application = ownerApplicationRepository.findById(id);
        if (application.isEmpty()) return ResponseEntity.notFound().build();
        OwnerApplication app = application.get();
        Long currentUserId = CurrentUser.getId();
        // Only the applicant or an ADMIN may view an owner application
        if (!CurrentUser.isAdmin() && (currentUserId == null || app.getUserId() == null || !app.getUserId().equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(app);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getOwnerApplicationsByUser(@PathVariable Long userId) {
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || !userId.equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ownerApplicationRepository.findByUserId(userId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createOwnerApplication(@Valid @RequestBody OwnerApplication application) {
        // SECURITY: applications are always tied to the authenticated user
        application.setUserId(CurrentUser.getId());
        if (application.getStatus() == null) application.setStatus("pending");
        OwnerApplication saved = ownerApplicationRepository.save(application);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> updateOwnerApplicationStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<OwnerApplication> existing = ownerApplicationRepository.findById(id);
        if (existing.isPresent()) {
            OwnerApplication application = existing.get();
            String newStatus = body.getOrDefault("status", application.getStatus());
            application.setStatus(newStatus);
            if (body.containsKey("adminNote")) application.setAdminNote(body.get("adminNote"));

            // REAL VERIFICATION: approving an application upgrades the applicant's
            // role to VERIFIED_OWNER server-side. Rejecting removes the badge.
            if (application.getUserId() != null) {
                userRepository.findById(application.getUserId()).ifPresent(user -> {
                    if ("approved".equalsIgnoreCase(newStatus)) {
                        user.setRole(User.Role.VERIFIED_OWNER);
                        user.setVerified(true);
                    } else if ("rejected".equalsIgnoreCase(newStatus)) {
                        user.setRole(User.Role.OWNER);
                    }
                    userRepository.save(user);
                });
            }
            return ResponseEntity.ok(ownerApplicationRepository.save(application));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteOwnerApplication(@PathVariable Long id) {
        Optional<OwnerApplication> existing = ownerApplicationRepository.findById(id);
        if (existing.isPresent()) {
            ownerApplicationRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Owner application deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}