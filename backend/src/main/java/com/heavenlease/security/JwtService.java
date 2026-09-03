package com.heavenlease.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Service
public class JwtService {

    /**
     * The known dev/test fallback secrets must never be usable as a production
     * signing key — a token signed with them is trivially forgeable.
     */
    private static final java.util.Set<String> FORBIDDEN_SECRETS = java.util.Set.of(
            "HeavenLease-dev-secret-key-2026-change-me-now",
            "HeavenLease-test-secret-key-2026-abcdefghij"
    );

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    @PostConstruct
    public void validateSecret() {
        if (secret == null || secret.isBlank() || secret.length() < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set and at least 32 characters long. "
                    + "Generate one with: openssl rand -base64 48");
        }
        if (FORBIDDEN_SECRETS.contains(secret)) {
            throw new IllegalStateException(
                    "JWT_SECRET is a known dev/test fallback value. Set a unique, strong secret via JWT_SECRET in backend/.env "
                    + "before starting the app.");
        }
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String extractUsername(String token) {
        return extractClaim(token, claims -> claims.getSubject());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, claims -> claims.getExpiration());
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", userDetails.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .orElse("TENANT"));
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /**
     * Generates a short-lived (10 minute) JWT used only for password reset.
     * Contains a "purpose" claim = "reset" so it can never be used as a
     * normal authentication token.
     */
    public String generateResetToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("purpose", "reset");
        return Jwts.builder()
                .claims(claims)
                .subject(email)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + 10 * 60 * 1000)) // 10 minutes
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Validates that a token is a valid, unexpired password-reset token
     * issued for the given email. Returns false for normal auth tokens.
     */
    public boolean isResetTokenValid(String token, String email) {
        try {
            Claims claims = extractAllClaims(token);
            boolean isReset = "reset".equals(claims.get("purpose", String.class));
            boolean subjectMatches = email.equals(claims.getSubject());
            boolean notExpired = !isTokenExpired(token);
            return isReset && subjectMatches && notExpired;
        } catch (Exception e) {
            return false;
        }
    }
}