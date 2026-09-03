package com.heavenlease.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.heavenlease.model.User;
import com.heavenlease.repository.UserRepository;

/**
 * Seeds the first ADMIN account at startup from environment variables:
 * ADMIN_EMAIL and ADMIN_PASSWORD. If an admin already exists, nothing happens.
 */
@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    /**
     * Known-default / trivially predictable admin passwords that must NEVER be
     * accepted, even accidentally (docker-compose previously defaulted to ChangeMe123!).
     */
    private static final java.util.Set<String> FORBIDDEN_PASSWORDS = java.util.Set.of(
            "ChangeMe123!", "changeme123!", "Admin@123", "admin123", "password", "Password1"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("Admin bootstrap skipped: set app.admin.email / app.admin.password (ADMIN_EMAIL / ADMIN_PASSWORD) to seed the first admin.");
            return;
        }
        // SECURITY: refuse blank, weak, or known-default admin passwords so a buyer
        // deploying with defaults (or with docker-compose's old ChangeMe123!) can
        // never end up with a publicly-known admin login.
        String password = adminPassword.trim();
        if (password.length() < 8 || FORBIDDEN_PASSWORDS.contains(password)) {
            log.warn("Admin bootstrap skipped: ADMIN_PASSWORD is too short or a known default. Set a strong, unique password before first boot.");
            return;
        }
        boolean adminExists = userRepository.findAll().stream()
                .anyMatch(u -> u.getRole() == User.Role.ADMIN);
        if (adminExists) {
            return;
        }
        User admin = new User();
        admin.setEmail(adminEmail.trim().toLowerCase());
        admin.setFullName("Administrator");
        admin.setPhone("");
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(User.Role.ADMIN);
        admin.setVerified(true);
        userRepository.save(admin);
        log.info("Seeded initial ADMIN account: {}", admin.getEmail());
    }
}