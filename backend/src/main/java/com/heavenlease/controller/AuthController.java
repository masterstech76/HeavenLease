package com.heavenlease.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import com.heavenlease.dto.GoogleLoginRequest;
import com.heavenlease.dto.LoginRequest;
import com.heavenlease.dto.LoginResponse;
import com.heavenlease.dto.TenantSignupRequest;
import com.heavenlease.model.User;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.JwtService;
import com.heavenlease.service.EmailVerificationService;
import com.heavenlease.service.GoogleService;
import com.heavenlease.service.LoginAttemptService;
import com.heavenlease.service.ReCaptchaService;
import com.heavenlease.service.SmsVerificationService;
import com.heavenlease.service.TwoFactorEmailService;
import com.heavenlease.service.TotpService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailVerificationService emailVerificationService;
    private final GoogleService googleService;
    private final SmsVerificationService smsVerificationService;
    private final ReCaptchaService reCaptchaService;
    private final LoginAttemptService loginAttemptService;
    private final TwoFactorEmailService twoFactorEmailService;
    private final TotpService totpService;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, EmailVerificationService emailVerificationService, GoogleService googleService, SmsVerificationService smsVerificationService, ReCaptchaService reCaptchaService, LoginAttemptService loginAttemptService, TwoFactorEmailService twoFactorEmailService, TotpService totpService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailVerificationService = emailVerificationService;
        this.googleService = googleService;
        this.smsVerificationService = smsVerificationService;
        this.reCaptchaService = reCaptchaService;
        this.loginAttemptService = loginAttemptService;
        this.twoFactorEmailService = twoFactorEmailService;
        this.totpService = totpService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String key = request.getEmail() != null ? request.getEmail().toLowerCase() : "";
        // reCAPTCHA enforcement when a secret is configured (never trust mock tokens).
        if (!reCaptchaIsOpen() && !reCaptchaService.verify(request.getCaptchaToken())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Captcha verification failed. Please try again."));
        }
        // Anti brute-force: temporary lockout after repeated failures
        if (!key.isBlank() && loginAttemptService.isLocked(key)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many failed attempts. Please try again in 15 minutes."));
        }
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            loginAttemptService.loginSucceeded(key);
            return issueLogin(user);
        } catch (org.springframework.security.authentication.DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "This account has been deactivated. Contact support to reactivate."));
        } catch (BadCredentialsException e) {
            loginAttemptService.loginFailed(key);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password"));
        } catch (RuntimeException e) {
            loginAttemptService.loginFailed(key);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password"));
        }
    }

    @PostMapping("/2fa/email/send")
    public ResponseEntity<?> send2faEmail(@RequestBody Map<String, String> body) {
        User user = pendingUser(body.get("challengeToken"));
        if (user == null || !user.isTwoFactorEmailEnabled()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid 2FA challenge"));
        try { twoFactorEmailService.send(user); return ResponseEntity.ok(Map.of("message", "Verification code sent", "expiresIn", 300)); }
        catch (IllegalStateException e) { return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", e.getMessage())); }
        catch (RuntimeException e) { return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", "Email verification is temporarily unavailable.")); }
    }

    @PostMapping("/2fa/email/verify")
    public ResponseEntity<?> verify2faEmail(@RequestBody Map<String, String> body) {
        User user = pendingUser(body.get("challengeToken"));
        if (user == null || !user.isTwoFactorEmailEnabled()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid 2FA challenge"));
        if (!twoFactorEmailService.verify(user, body.get("code"))) return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification code"));
        return finish2fa(user);
    }

    @PostMapping("/2fa/totp/verify")
    public ResponseEntity<?> verify2faTotp(@RequestBody Map<String, String> body) {
        User user = pendingUser(body.get("challengeToken"));
        if (user == null || !user.isTwoFactorTotpEnabled()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid 2FA challenge"));
        boolean ok = totpService.verify(totpService.decrypt(user.getTotpSecretEncrypted()), body.get("code"));
        if (!ok) return ResponseEntity.badRequest().body(Map.of("error", "Invalid authenticator code"));
        return finish2fa(user);
    }

    @PostMapping("/2fa/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> twoFactorStatus() {
        User user = currentAuthenticatedUser();
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of("emailEnabled", user.isTwoFactorEmailEnabled(), "totpEnabled", user.isTwoFactorTotpEnabled()));
    }

    @PostMapping("/2fa/totp/setup")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> setupTotp() {
        User user = currentAuthenticatedUser();
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String secret = totpService.newSecret();
        user.setTotpSecretEncrypted(totpService.encrypt(secret));
        user.setTwoFactorTotpEnabled(false);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("secret", secret, "issuer", "HeavenLease", "account", user.getEmail(), "otpauthUri", totpService.otpauthUri(user.getEmail(), secret), "qrCode", totpService.qrDataUrl(user.getEmail(), secret)));
    }

    @PostMapping("/2fa/totp/enable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> enableTotp(@RequestBody Map<String, String> body) {
        User user = currentAuthenticatedUser();
        if (user == null || user.getTotpSecretEncrypted() == null) return ResponseEntity.badRequest().body(Map.of("error", "Authenticator setup has not been started"));
        if (!totpService.verify(totpService.decrypt(user.getTotpSecretEncrypted()), body.get("code"))) return ResponseEntity.badRequest().body(Map.of("error", "Invalid authenticator code"));
        user.setTwoFactorTotpEnabled(true); userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Authenticator 2FA enabled"));
    }

    @PostMapping("/2fa/totp/disable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> disableTotp(@RequestBody Map<String, String> body) {
        User user = currentAuthenticatedUser();
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!passwordEncoder.matches(body.getOrDefault("password", ""), user.getPasswordHash())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Password verification failed"));
        user.setTwoFactorTotpEnabled(false); user.setTotpSecretEncrypted(null); userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Authenticator 2FA disabled"));
    }

    @PostMapping("/2fa/email/enable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> enableEmail2fa() {
        User user = currentAuthenticatedUser();
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        user.setTwoFactorEmailEnabled(true); userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Email OTP 2FA enabled"));
    }

    @PostMapping("/2fa/email/disable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> disableEmail2fa(@RequestBody Map<String, String> body) {
        User user = currentAuthenticatedUser();
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!passwordEncoder.matches(body.getOrDefault("password", ""), user.getPasswordHash())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Password verification failed"));
        user.setTwoFactorEmailEnabled(false); userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Email OTP 2FA disabled"));
    }

    @PostMapping("/phone-login")
    public ResponseEntity<?> phoneLogin(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String password = body.get("password");
        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and password are required"));
        }
        String normalizedPhone = phone.replaceAll("[^0-9]", "");
        if (normalizedPhone.startsWith("91") && normalizedPhone.length() == 12) {
            normalizedPhone = normalizedPhone.substring(2);
        }
        if (normalizedPhone.startsWith("0")) {
            normalizedPhone = normalizedPhone.substring(1);
        }
        String lockKey = "phone:" + normalizedPhone;
        if (loginAttemptService.isLocked(lockKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many failed attempts. Please try again in 15 minutes."));
        }
        return userRepository.findByPhone(normalizedPhone)
                .<ResponseEntity<?>>map(user -> {
                    if (user.isDeactivated()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "This account has been deactivated."));
                    }
                    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                        loginAttemptService.loginFailed(lockKey);
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid phone or password"));
                    }
                    loginAttemptService.loginSucceeded(lockKey);
                    return issueLogin(user);
                })
                .orElseGet(() -> {
                    loginAttemptService.loginFailed(lockKey);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid phone or password"));
                });
    }

    @PostMapping("/email-otp-login")
    public ResponseEntity<?> emailOtpLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and code are required"));
        }
        boolean valid = emailVerificationService.verifyCode(email, code);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired OTP"));
        }
        return userRepository.findByEmail(email)
                .<ResponseEntity<?>>map(user -> {
                    if (user.isDeactivated()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "This account has been deactivated."));
                    }
                    return issueLogin(user);
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found")));
    }

    @PostMapping("/phone-otp-login")
    public ResponseEntity<?> phoneOtpLogin(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String code = body.get("code");
        if (phone == null || phone.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and code are required"));
        }
        boolean valid = smsVerificationService.verifyCode(phone, code);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired OTP"));
        }
        String normalizedPhone = phone.replaceAll("[^0-9]", "");
        if (normalizedPhone.startsWith("91") && normalizedPhone.length() == 12) {
            normalizedPhone = normalizedPhone.substring(2);
        }
        if (normalizedPhone.startsWith("0")) {
            normalizedPhone = normalizedPhone.substring(1);
        }
        return userRepository.findByPhone(normalizedPhone)
                .<ResponseEntity<?>>map(user -> {
                    if (user.isDeactivated()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "This account has been deactivated."));
                    }
                    return issueLogin(user);
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found")));
    }

    @PostMapping("/verify-captcha")
    public ResponseEntity<?> verifyCaptcha(@RequestBody Map<String, String> body) {
        String captchaToken = body.get("captchaToken");
        if (captchaToken == null || captchaToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Captcha token is required"));
        }
        // Real server-side reCAPTCHA verification.
        boolean valid = reCaptchaService.verify(captchaToken);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Captcha verification failed"));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Captcha verified"));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        try {
            Map<String, Object> googleUser = googleService.getUserInfo(request.getIdToken());
            String googleId = String.valueOf(googleUser.get("sub"));
            String email = googleUser.get("email") != null ? String.valueOf(googleUser.get("email")) : null;
            String name = googleUser.get("name") != null ? String.valueOf(googleUser.get("name")) : "Google User";
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Google account does not have an email. Please sign up with your email instead."));
            }
            User user = userRepository.findByGoogleId(googleId).orElse(null);
            if (user == null) {
                user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    user.setGoogleId(googleId);
                    user = userRepository.save(user);
                }
            }
            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setFullName(name);
                user.setPhone("");
                user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                user.setGoogleId(googleId);
                // New Google accounts respect the role the user selected on the
                // signup page (TENANT or OWNER only — never ADMIN / VERIFIED_OWNER).
                user.setRole(safeRole(request.getRole()));
                user.setVerified(true);
                user = userRepository.save(user);
            }
            return issueLogin(user);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Google authentication failed"));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody TenantSignupRequest request) {
        // reCAPTCHA enforcement (skip when no secret configured — keys enable it).
        if (!reCaptchaIsOpen() && !reCaptchaService.verify(request.getCaptchaToken())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Captcha verification failed. Please try again."));
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        // Validate Indian 10-digit phone (starts with 6-9)
        String phone = request.getPhone() != null ? request.getPhone().trim() : "";
        if (!phone.matches("^[6-9]\\d{9}$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid 10-digit Indian phone number"));
        }
        // Password strength: min 8 chars, at least one letter and one number
        String password = request.getPassword();
        if (password == null || password.length() < 8
                || !password.matches(".*[A-Za-z].*") || !password.matches(".*[0-9].*")) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Password must be at least 8 characters and contain both letters and numbers"));
        }
        // SECURITY: the client may only ever pick TENANT or OWNER at signup.
        // ADMIN and VERIFIED_OWNER are granted exclusively by an admin action.
        User.Role role = safeRole(request.getRole());
        // If an OTP code was provided, verify it; the account is created already email-verified.
        boolean emailVerified = false;
        String code = request.getCode();
        if (code != null && !code.isBlank()) {
            if (!emailVerificationService.verifyCode(request.getEmail(), code)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification code"));
            }
            emailVerified = true;
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setVerified(emailVerified);
        user = userRepository.save(user);
        // Only issue a fresh code when the signup did not already bring a verified OTP.
        if (!emailVerified) {
            emailVerificationService.generateCode(user.getEmail());
        }
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPasswordHash(),
                java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        String token = jwtService.generateToken(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(new LoginResponse(token, user.getEmail(), user.getRole().name(), user.getId(), user.getFullName()));
    }

    /**
     * Issues a verification code for an email that does NOT have an account yet.
     * Used by the public signup flow to send the OTP BEFORE the user is created.
     * Legacy account-verification delivery; login 2FA uses the native SMTP-backed TwoFactorEmailService above.
     */
    @PostMapping("/send-signup-code")
    public ResponseEntity<?> sendSignupCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        emailVerificationService.generateCode(email);
        return ResponseEntity.ok(Map.of("message", "Verification code sent"));
    }

    @PostMapping("/send-sms-otp")
    public ResponseEntity<?> sendSmsOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number is required"));
        }
        try {
            SmsVerificationService.OtpDelivery delivery = smsVerificationService.generateCode(phone);
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", delivery.deliveryMessage());
            resp.put("deliveryChannel", delivery.deliveryChannel());
            resp.put("otpPreview", delivery.otpPreview());
            resp.put("resendAfterSeconds", delivery.resendAfterSeconds());
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-sms-otp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifySmsOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String code = body.get("code");
        if (phone == null || phone.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and code are required"));
        }
        User current = currentAuthenticatedUser();
        if (current == null || !SmsVerificationService.normalizePhone(current.getPhone()).equals(SmsVerificationService.normalizePhone(phone))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only verify the phone number on your own account"));
        }
        boolean valid = smsVerificationService.verifyCode(phone, code);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired OTP"));
        }
        return ResponseEntity.ok(Map.of("message", "Phone verified successfully"));
    }

    @PostMapping("/send-verification")
    public ResponseEntity<?> sendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        // Do not reveal whether the email is registered.
        if (userRepository.existsByEmail(email)) {
            emailVerificationService.generateCode(email);
        }
        return ResponseEntity.ok(Map.of("message", "If the account exists, a verification code has been sent"));
    }

    @PostMapping("/verify-email")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and code are required"));
        }
        User current = currentAuthenticatedUser();
        if (current == null || current.getEmail() == null || !current.getEmail().equalsIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only verify the email on your own account"));
        }
        boolean valid = emailVerificationService.verifyCode(email, code);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification code"));
        }
        java.util.Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setVerified(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        // SECURITY: always take the same code path for known AND unknown emails so
        // response timing does not reveal whether an email exists (user enumeration).
        // For unknown emails, a code is generated & stored but no email exists to send it to.
        emailVerificationService.generateCode(email);
        return ResponseEntity.ok(Map.of("message", "If the email exists, a reset code has been sent"));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<?> verifyResetOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and code are required"));
        }
        boolean valid = emailVerificationService.verifyCode(email, code);
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset code"));
        }
        // Issue a short-lived reset token (JWT with 10 min expiry)
        String resetToken = jwtService.generateResetToken(email);
        return ResponseEntity.ok(Map.of("resetToken", resetToken, "message", "Code verified. You can now reset your password."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String resetToken = body.get("resetToken");
        String newPassword = body.get("newPassword");
        if (email == null || email.isBlank() || resetToken == null || resetToken.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email, reset token, and new password are required"));
        }
        if (newPassword.length() < 8
                || !newPassword.matches(".*[A-Za-z].*") || !newPassword.matches(".*[0-9].*")) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Password must be at least 8 characters and contain both letters and numbers"));
        }
        // Validate the reset token
        if (!jwtService.isResetTokenValid(resetToken, email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired reset token"));
        }
        java.util.Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(Authentication authentication) {
        String email = authentication == null ? null : authentication.getName();
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // A token whose user row no longer exists must be invalidated with 401,
            // not 500 — the frontend auto-logs-out on 401.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
        }
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("phone", user.getPhone());
        response.put("role", user.getRole().name());
        response.put("verified", user.isVerified());
        // Instagram-style profile fields so the dashboard and edit-profile
        // pages always render the saved values.
        response.put("username", user.getUsername());
        response.put("bio", user.getBio());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("website", user.getWebsite());
        response.put("gender", user.getGender());
        return ResponseEntity.ok(response);
    }

    private User currentAuthenticatedUser() {
        Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName()).orElse(null);
    }

    /**
     * Returns true when reCAPTCHA is NOT configured so login/signup remain open.
     * When a real secret key is set, the enforcement path (reCaptchaService.verify)
     * is required and mock tokens are rejected.
     */
    private User pendingUser(String token) {
        try {
            if (token == null || !jwtService.isPending2faToken(token)) return null;
            return userRepository.findByEmail(jwtService.extractUsername(token)).orElse(null);
        } catch (Exception e) { return null; }
    }

    private ResponseEntity<?> issueLogin(User user) {
        if (user.isDeactivated()) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "This account has been deactivated."));
        if (user.isTwoFactorEmailEnabled() || user.isTwoFactorTotpEnabled()) {
            Map<String, Object> response = new HashMap<>();
            response.put("twoFactorRequired", true);
            response.put("challengeToken", jwtService.generatePending2faToken(user.getEmail()));
            response.put("emailEnabled", user.isTwoFactorEmailEnabled());
            response.put("totpEnabled", user.isTwoFactorTotpEnabled());
            response.put("emailHint", maskEmail(user.getEmail()));
            return ResponseEntity.ok(response);
        }
        UserDetails details = new org.springframework.security.core.userdetails.User(user.getEmail(), user.getPasswordHash(),
                java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        return ResponseEntity.ok(new LoginResponse(jwtService.generateToken(details), user.getEmail(), user.getRole().name(), user.getId(), user.getFullName()));
    }

    private ResponseEntity<?> finish2fa(User user) {
        UserDetails details = new org.springframework.security.core.userdetails.User(user.getEmail(), user.getPasswordHash(),
                java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        return ResponseEntity.ok(new LoginResponse(jwtService.generateToken(details), user.getEmail(), user.getRole().name(), user.getId(), user.getFullName()));
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@'); if (at <= 1) return "••••" + email.substring(Math.max(at, 0));
        return email.substring(0, 2) + "••••" + email.substring(at);
    }

    private boolean reCaptchaIsOpen() {
        String secret = reCaptchaService.getConfiguredSecretOrNull();
        return secret == null || secret.isBlank();
    }

    /**
     * Maps a client-supplied role string to a safe signup role.
     * Only TENANT or OWNER may ever be chosen by the user at registration.
     * ADMIN and VERIFIED_OWNER can only be granted server-side by an admin.
     */
    private User.Role safeRole(String requested) {
        if (requested != null && "OWNER".equalsIgnoreCase(requested.trim())) {
            return User.Role.OWNER;
        }
        return User.Role.TENANT;
    }
}