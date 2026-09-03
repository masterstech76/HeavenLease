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

import com.heavenlease.model.Notification;
import com.heavenlease.repository.NotificationRepository;
import com.heavenlease.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/notifications")
@SuppressWarnings("null")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllNotifications() {
        return ResponseEntity.ok(notificationRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getNotification(@PathVariable Long id) {
        Optional<Notification> notification = notificationRepository.findById(id);
        if (notification.isEmpty()) return ResponseEntity.notFound().build();
        // IDOR guard: only the notification owner (or ADMIN) may read it
        Long currentUserId = CurrentUser.getId();
        Notification n = notification.get();
        if (!CurrentUser.isAdmin() && (currentUserId == null || n.getUserId() == null || !n.getUserId().equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(n);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getNotificationsByUser(@PathVariable Long userId) {
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || !userId.equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(notificationRepository.findByUserId(userId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createNotification(@Valid @RequestBody Notification notification) {
        // Notifications are always created for the authenticated user
        notification.setUserId(CurrentUser.getId());
        notification.setRead(false);
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> markNotificationRead(@PathVariable Long id) {
        Optional<Notification> existing = notificationRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Notification notification = existing.get();
        Long currentUserId = CurrentUser.getId();
        // Only the notification owner may mark it read
        if (!CurrentUser.isAdmin() && (currentUserId == null || notification.getUserId() == null
                || !notification.getUserId().equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        notification.setRead(true);
        return ResponseEntity.ok(notificationRepository.save(notification));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        Optional<Notification> existing = notificationRepository.findById(id);
        if (existing.isPresent()) {
            notificationRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Notification deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}