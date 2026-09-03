package com.heavenlease.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.BookingRepository;
import com.heavenlease.repository.FavoriteRepository;
import com.heavenlease.repository.LeaseRepository;
import com.heavenlease.repository.MessageRepository;
import com.heavenlease.repository.NotificationRepository;
import com.heavenlease.repository.OwnerApplicationRepository;
import com.heavenlease.repository.PaymentRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;
/**
 * Self-service account lifecycle: Deactivate (soft, reversible by an admin)
 * and Delete permanently (removes the user + all related data). Only the
 * account owner themselves may do this.
 */
@RestController
@RequestMapping("/api/account")
@SuppressWarnings("null")
public class AccountController {

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final BookingRepository bookingRepository;
    private final LeaseRepository leaseRepository;
    private final FavoriteRepository favoriteRepository;
    private final NotificationRepository notificationRepository;
    private final PaymentRepository paymentRepository;
    private final OwnerApplicationRepository ownerApplicationRepository;
    private final MessageRepository messageRepository;

    public AccountController(UserRepository userRepository,
                             PropertyRepository propertyRepository,
                             BookingRepository bookingRepository,
                             LeaseRepository leaseRepository,
                             FavoriteRepository favoriteRepository,
                             NotificationRepository notificationRepository,
                             PaymentRepository paymentRepository,
                             OwnerApplicationRepository ownerApplicationRepository,
                             MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.bookingRepository = bookingRepository;
        this.leaseRepository = leaseRepository;
        this.favoriteRepository = favoriteRepository;
        this.notificationRepository = notificationRepository;
        this.paymentRepository = paymentRepository;
        this.ownerApplicationRepository = ownerApplicationRepository;
        this.messageRepository = messageRepository;
    }
/**
     * Deactivate the current user's account (soft delete).
     * The user can no longer log in. Admin can reactivate by clearing the flag.
     */
    @PostMapping("/deactivate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deactivate(@RequestBody(required = false) Map<String, String> body) {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not identify current user."));
        }
        Optional<User> existing = userRepository.findById(userId);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = existing.get();
        if (user.isDeactivated()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Account is already deactivated."));
        }
        user.setDeactivated(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Account deactivated. You can contact support to reactivate it."));
    }
/**
     * Permanently delete the current user's account and ALL related data.
     * This cannot be undone.
     */
    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> deleteAccount() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not identify current user."));
        }
        Optional<User> existing = userRepository.findById(userId);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Delete all related data in dependency-safe order.
        notificationRepository.deleteAll(notificationRepository.findByUserId(userId));
        favoriteRepository.deleteAll(favoriteRepository.findByUserId(userId));
        ownerApplicationRepository.deleteAll(ownerApplicationRepository.findByUserId(userId));
        paymentRepository.deleteAll(paymentRepository.findByUserId(userId));

        bookingRepository.deleteAll(bookingRepository.findByTenantId(userId));
        bookingRepository.deleteAll(bookingRepository.findByOwnerId(userId));

        leaseRepository.deleteAll(leaseRepository.findByTenantId(userId));
        leaseRepository.deleteAll(leaseRepository.findByOwnerId(userId));

        messageRepository.deleteAll(messageRepository.findBySenderId(userId));
        messageRepository.deleteAll(messageRepository.findByReceiverId(userId));

        for (Property p : propertyRepository.findByOwnerId(userId)) {
            bookingRepository.deleteAll(bookingRepository.findByPropertyId(p.getId()));
            leaseRepository.deleteAll(leaseRepository.findByPropertyId(p.getId()));
            propertyRepository.delete(p);
        }

        userRepository.delete(existing.get());
        return ResponseEntity.ok(Map.of("message", "Account permanently deleted. All your data has been removed."));
    }
}
