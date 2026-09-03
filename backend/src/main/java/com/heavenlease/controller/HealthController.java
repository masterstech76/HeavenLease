package com.heavenlease.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight health check endpoint. Useful for load balancers, uptime
 * monitors, Docker healthchecks, and the buyer's deployment guide.
 * This endpoint is intentionally unauthenticated.
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "HeavenLease",
                "time", System.currentTimeMillis()
        ));
    }

    @GetMapping("/api/health/live")
    public ResponseEntity<?> liveness() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}