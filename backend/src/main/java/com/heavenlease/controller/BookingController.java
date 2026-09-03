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

import com.heavenlease.dto.BookingRequest;
import com.heavenlease.model.Booking;
import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.BookingRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/bookings")
@SuppressWarnings("null")
public class BookingController {

    private final BookingRepository bookingRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;

    public BookingController(BookingRepository bookingRepository, PropertyRepository propertyRepository, UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllBookings() {
        return ResponseEntity.ok(bookingRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getBooking(@PathVariable Long id) {
        Optional<Booking> booking = bookingRepository.findById(id);
        if (booking.isEmpty()) return ResponseEntity.notFound().build();
        Booking b = booking.get();
        Long currentUserId = CurrentUser.getId();
        boolean isOwnerOrAdmin = CurrentUser.hasAnyRole("OWNER", "VERIFIED_OWNER", "ADMIN");
        boolean canAccess = (currentUserId != null && b.getTenantId() != null && b.getTenantId().equals(currentUserId))
                || (b.getOwnerId() != null && b.getOwnerId().equals(currentUserId))
                || (isOwnerOrAdmin && CurrentUser.isAdmin());
        return canAccess ? ResponseEntity.ok(b) : ResponseEntity.notFound().build();
    }

    @GetMapping("/property/{propertyId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getBookingsByProperty(@PathVariable Long propertyId) {
        Long currentUserId = CurrentUser.getId();
        if (CurrentUser.isAdmin()) return ResponseEntity.ok(bookingRepository.findByPropertyId(propertyId));
        // Only the property owner (or its managing owner) should see property bookings.
        Optional<Property> property = propertyRepository.findById(propertyId);
        if (property.isEmpty()) return ResponseEntity.notFound().build();
        if (property.get().getOwnerId() == null || !property.get().getOwnerId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You are not the owner of this property"));
        }
        return ResponseEntity.ok(bookingRepository.findByPropertyId(propertyId));
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getBookingsByTenant(@PathVariable Long tenantId) {
        // Any user can only see their own bookings (unless ADMIN — handled in /all)
        if (!tenantId.equals(CurrentUser.getId()) && !CurrentUser.isAdmin()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(bookingRepository.findByTenantId(tenantId));
    }

    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getBookingsByOwner(@PathVariable Long ownerId) {
        if (!ownerId.equals(CurrentUser.getId()) && !CurrentUser.isAdmin()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(bookingRepository.findByOwnerId(ownerId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookingRequest request) {
        Long currentUserId = CurrentUser.getId();
        // SECURITY: tenant of the booking MUST be the authenticated user.
        if (request.getTenantId() == null || !request.getTenantId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Cannot create a booking for another user"));
        }
        // Real feature: only verified users may book tours (anti-bypass #29)
        if (currentUserId != null) {
            User tenant = userRepository.findById(currentUserId).orElse(null);
            if (tenant == null || !tenant.isVerified()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Please verify your email/phone before booking a tour"));
            }
        }
        Booking booking = new Booking();
        booking.setPropertyId(request.getPropertyId());
        booking.setTenantId(currentUserId);
        booking.setOwnerId(request.getOwnerId());
        booking.setTourDate(request.getTourDate());
        booking.setTourTime(request.getTourTime());
        booking.setStatus("pending");
        booking.setMessage(request.getMessage());
        booking.setTenantName(request.getTenantName());
        booking.setTenantPhone(request.getTenantPhone());
        booking.setPropertyTitle(request.getPropertyTitle());
        Booking saved = bookingRepository.save(booking);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'VERIFIED_OWNER', 'ADMIN')")
    public ResponseEntity<?> updateBookingStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Booking> existing = bookingRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Booking booking = existing.get();
        // Only the owner of the booking's property (or ADMIN) may change status
        boolean isOwner = booking.getOwnerId() != null && booking.getOwnerId().equals(CurrentUser.getId());
        if (!isOwner && !CurrentUser.isAdmin()) {
            return ResponseEntity.notFound().build();
        }
        booking.setStatus(body.getOrDefault("status", booking.getStatus()));
        return ResponseEntity.ok(bookingRepository.save(booking));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteBooking(@PathVariable Long id) {
        Optional<Booking> existing = bookingRepository.findById(id);
        if (existing.isPresent()) {
            bookingRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Booking deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}