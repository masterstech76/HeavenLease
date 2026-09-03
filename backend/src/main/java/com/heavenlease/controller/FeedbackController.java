package com.heavenlease.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.Feedback;
import com.heavenlease.repository.FeedbackRepository;
import com.heavenlease.security.CurrentUser;

/**
 * Star-rating + comment feedback per feature page.
 *
 * Routes:
 *   POST /api/feedback                (submit stars + comment for a page)
 *   GET  /api/feedback/page/{pageKey} (recent feedback + aggregate for a page)
 *   GET  /api/feedback/mine           (my feedback)
 */
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private static final java.util.Set<String> ALLOWED_PAGE_KEYS = java.util.Set.of(
            "background_check", "comfort_feedback", "community", "credit_report",
            "employment", "rent_fairness", "identity", "lease_templates",
            "heavenlease_all", "maintenance", "no_broker", "owner_guides",
            "owner_support", "rent_pricing", "rental_history", "speed_kyc",
            "tax", "trust_safety", "possession", "tenant_screening"
    );

    private final FeedbackRepository feedbackRepository;

    public FeedbackController(FeedbackRepository feedbackRepository) {
        this.feedbackRepository = feedbackRepository;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> submit(@RequestBody Map<String, Object> body) {
        String pageKey = body.get("pageKey") != null ? String.valueOf(body.get("pageKey")) : "";
        Integer stars = body.get("stars") instanceof Number ? ((Number) body.get("stars")).intValue() : null;
        if (pageKey.isBlank() || !ALLOWED_PAGE_KEYS.contains(pageKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown feature page"));
        }
        if (stars == null || stars < 1 || stars > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rating must be between 1 and 5 stars"));
        }
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        String comment = body.get("comment") != null ? String.valueOf(body.get("comment")).trim() : "";
        if (comment.length() > 1000) comment = comment.substring(0, 1000);

        Feedback f = new Feedback();
        f.setUserId(userId);
        f.setPageKey(pageKey);
        f.setStars(stars);
        f.setComment(comment);
        feedbackRepository.save(f);

        return ResponseEntity.ok(Map.of(
                "message", "Thank you for your feedback!",
                "id", f.getId()
        ));
    }

    @GetMapping("/page/{pageKey}")
    public ResponseEntity<?> byPage(@PathVariable String pageKey) {
        if (pageKey == null || !ALLOWED_PAGE_KEYS.contains(pageKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown feature page"));
        }
        Double avg = feedbackRepository.averageStars(pageKey);
        long count = feedbackRepository.countByPageKey(pageKey);
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("pageKey", pageKey);
        result.put("average", avg == null ? 0 : Math.round(avg * 10.0) / 10.0);
        result.put("count", count);
        result.put("recent", feedbackRepository.findByPageKeyOrderByCreatedAtDesc(pageKey));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> mine() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(feedbackRepository.findByUserId(userId));
    }
}