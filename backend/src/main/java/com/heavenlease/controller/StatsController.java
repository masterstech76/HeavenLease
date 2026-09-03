package com.heavenlease.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.User;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;

/**
 * Public, real-time platform statistics served from the database. Every number
 * is a live count from the tables — nothing is hard-coded or decorative.
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;

    public StatsController(PropertyRepository propertyRepository, UserRepository userRepository) {
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getStats() {
        long activeProperties = propertyRepository.countActive();
        long cities = propertyRepository.countCities();
        long tenants = userRepository.countByRole(User.Role.TENANT);
        long verifiedOwners = userRepository.countByRole(User.Role.VERIFIED_OWNER)
                + userRepository.countByRole(User.Role.OWNER);
        // Single aggregate query — no need to load every row just to sum views.
        long totalViews = propertyRepository.sumViewCount();
        return ResponseEntity.ok(Map.of(
                "properties", activeProperties,
                "cities", cities,
                "tenants", tenants,
                "verifiedOwners", verifiedOwners,
                "totalViews", totalViews
        ));
    }
}