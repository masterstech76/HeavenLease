package com.heavenlease.security;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_SECONDS = 60;

    // Keyed by client IP only (not IP+path) so an attacker cannot bypass the
    // limit by rotating endpoints (/login, /phone-login, /signup, ...).
    private final Map<String, RateLimitEntry> attempts = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limit.max-requests-per-minute:10}")
    private int maxRequestsPerMinute;

    private record RateLimitEntry(int count, Instant windowStart) {
        Instant resetStart() { return windowStart; }
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();

        if (enabled && (path.startsWith("/api/auth/") || path.startsWith("/api/users"))) {
            String clientIp = request.getRemoteAddr();
            String key = clientIp;

            Instant now = Instant.now();
            RateLimitEntry entry = attempts.compute(key, (k, existing) -> {
                if (existing == null || existing.resetStart().plusSeconds(WINDOW_SECONDS).isBefore(now)) {
                    return new RateLimitEntry(1, now);
                }
                return new RateLimitEntry(existing.count() + 1, existing.resetStart());
            });

            if (entry.count() > maxRequestsPerMinute) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Prevents the in-memory map from growing forever. Runs every 5 minutes.
     */
    @Scheduled(fixedDelayString = "300000")
    public void cleanupExpiredEntries() {
        Instant cutoff = Instant.now().minusSeconds(WINDOW_SECONDS);
        attempts.entrySet().removeIf(e -> e.getValue().resetStart().isBefore(cutoff));
    }
}
