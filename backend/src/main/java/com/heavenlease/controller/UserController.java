package com.heavenlease.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

@RestController
@RequestMapping("/api/users")
@SuppressWarnings("null")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookingRepository bookingRepository;
    private final LeaseRepository leaseRepository;
    private final FavoriteRepository favoriteRepository;
    private final NotificationRepository notificationRepository;
    private final PaymentRepository paymentRepository;
    private final OwnerApplicationRepository ownerApplicationRepository;
    private final MessageRepository messageRepository;
    private final PropertyRepository propertyRepository;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          BookingRepository bookingRepository, LeaseRepository leaseRepository,
                          FavoriteRepository favoriteRepository, NotificationRepository notificationRepository,
                          PaymentRepository paymentRepository, OwnerApplicationRepository ownerApplicationRepository,
                          MessageRepository messageRepository, PropertyRepository propertyRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bookingRepository = bookingRepository;
        this.leaseRepository = leaseRepository;
        this.favoriteRepository = favoriteRepository;
        this.notificationRepository = notificationRepository;
        this.paymentRepository = paymentRepository;
        this.ownerApplicationRepository = ownerApplicationRepository;
        this.messageRepository = messageRepository;
        this.propertyRepository = propertyRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        Optional<User> user = userRepository.findById(id);
        if (user.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageUser(user.get())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only access your own profile"));
        }

        return ResponseEntity.ok(user.get());
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> existing = userRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();

        if (!canManageUser(existing.get())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only update your own profile"));
        }

        User user = existing.get();

        // SECURITY: only safe profile fields are accepted. Role and password hash
        // are NEVER read from the client (prevents privilege escalation).
        if (body.containsKey("fullName") && body.get("fullName") != null) {
            String fullName = body.get("fullName").trim();
            if (fullName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Full name cannot be empty"));
            }
            user.setFullName(fullName);
        }
        if (body.containsKey("phone") && body.get("phone") != null) {
            String phone = body.get("phone").trim();
            // Normalize before validating: strip spaces/dashes/parentheses and an
            // optional +91 / 91 prefix so " +91 98765 43210 " saves as "9876543210".
            String digits = phone.replaceAll("[^0-9]", "");
            if (digits.startsWith("91") && digits.length() == 12) {
                digits = digits.substring(2);
            }
            if (digits.length() == 10) {
                phone = digits;
            }
            if (!phone.isEmpty() && !phone.matches("^[6-9]\\d{9}$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid 10-digit Indian phone number"));
            }
            user.setPhone(phone);
        }
        // Instagram-style profile fields (safe, non-privileged).
        if (body.containsKey("username") && body.get("username") != null) {
            String username = body.get("username").trim().toLowerCase();
            if (username.isEmpty()) {
                // Username is optional — a blank value clears it instead of failing.
                user.setUsername(null);
            } else {
                if (!username.matches("^[a-z0-9._]{3,30}$")) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Username must be 3-30 chars: letters, numbers, dot, underscore only"));
                }
                // Username is globally unique (column unique=true). Verify it's not taken.
                Optional<User> clash = userRepository.findByUsername(username);
                if (clash.isPresent() && !clash.get().getId().equals(user.getId())) {
                    return ResponseEntity.badRequest().body(Map.of("error", "That username is already taken"));
                }
                user.setUsername(username);
            }
        }
        if (body.containsKey("bio") && body.get("bio") != null) {
            String bio = body.get("bio").trim();
            if (bio.length() > 300) bio = bio.substring(0, 300);
            user.setBio(bio);
        }
        if (body.containsKey("website") && body.get("website") != null) {
            String website = body.get("website").trim();
            if (!website.isEmpty()) {
                if (!website.matches("^(https?:\\/\\/)?[a-zA-Z0-9][-a-zA-Z0-9.]*\\.[a-zA-Z]{2,}(\\/\\S*)?$")) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid URL"));
                }
                if (!website.startsWith("http://") && !website.startsWith("https://")) {
                    website = "https://" + website;
                }
            }
            user.setWebsite(website);
        }
        if (body.containsKey("gender") && body.get("gender") != null) {
            String gender = body.get("gender").trim();
            if (!gender.isEmpty() && !gender.matches("(?i)^(male|female|other)$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Gender must be Male, Female or Other"));
            }
            user.setGender(gender.isEmpty() ? null : gender.toLowerCase());
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/{id}/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> uploadAvatar(@PathVariable Long id,
                                          @RequestParam("file") MultipartFile file) {
        Optional<User> existing = userRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        if (!canManageUser(existing.get())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only update your own profile"));
        }

        // Basic image validation (mime + size cap ~5 MB).
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image must be under 5 MB"));
        }
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!(mime.equals("image/jpeg") || mime.equals("image/png") || mime.equals("image/webp") || mime.equals("image/gif"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only JPG, PNG, WEBP or GIF images are allowed"));
        }

        try {
            String uploadDir = System.getenv().getOrDefault("UPLOAD_DIR", "./uploads");
            java.io.File dir = new java.io.File(uploadDir, "avatars");
            if (!dir.exists() && !dir.mkdirs()) {
                return ResponseEntity.internalServerError().body(Map.of("error", "Could not create upload directory"));
            }
            String ext = mime.equals("image/png") ? ".png" : mime.equals("image/webp") ? ".webp" : mime.equals("image/gif") ? ".gif" : ".jpg";
            String filename = "avatar-" + id + "-" + System.currentTimeMillis() + ext;
            java.io.File target = new java.io.File(dir, filename);
            file.transferTo(target);

            String avatarUrl = "/uploads/avatars/" + filename;
            existing.get().setAvatarUrl(avatarUrl);
            userRepository.save(existing.get());

            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
        } catch (java.io.IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload avatar: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updatePassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String password = body.get("password");
        if (password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
        }
        if (password.length() < 8
                || !password.matches(".*[A-Za-z].*") || !password.matches(".*[0-9].*")) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Password must be at least 8 characters and contain both letters and numbers"));
        }
        Optional<User> existing = userRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();

        if (!canManageUser(existing.get())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only change your own password"));
        }

        existing.get().setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(existing.get());
        return ResponseEntity.ok(Map.of("message", "Password updated"));
    }

    private boolean canManageUser(User targetUser) {
        if (targetUser == null) {
            return false;
        }

        Long currentUserId = CurrentUser.getId();
        if (currentUserId != null && currentUserId.equals(targetUser.getId())) {
            return true;
        }
        if (CurrentUser.hasAnyRole("ADMIN")) {
            return true;
        }

        Authentication authentication = CurrentUser.getAuthentication();
        if (authentication == null) {
            return false;
        }

        String currentUsername = authentication.getName();
        return currentUsername != null
                && targetUser.getEmail() != null
                && currentUsername.equalsIgnoreCase(targetUser.getEmail());
    }

    @PutMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> verifyUser(@PathVariable Long id) {
        Optional<User> existing = userRepository.findById(id);
        if (existing.isPresent()) {
            existing.get().setVerified(true);
            return ResponseEntity.ok(userRepository.save(existing.get()));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> existing = userRepository.findById(id);
        if (existing.isPresent()) {
            Long userId = id;
            // Delete all related data in dependency-safe order (mirrors the
            // self-service AccountController.deleteAccount flow) so admin user
            // deletion never leaves orphaned rows behind.
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
            return ResponseEntity.ok(Map.of("message", "User deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}