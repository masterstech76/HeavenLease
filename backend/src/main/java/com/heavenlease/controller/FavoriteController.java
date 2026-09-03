package com.heavenlease.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.Favorite;
import com.heavenlease.repository.FavoriteRepository;
import com.heavenlease.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/favorites")
@SuppressWarnings("null")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;

    public FavoriteController(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllFavorites() {
        return ResponseEntity.ok(favoriteRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getFavorite(@PathVariable Long id) {
        Optional<Favorite> favorite = favoriteRepository.findById(id);
        if (favorite.isEmpty()) return ResponseEntity.notFound().build();
        Favorite f = favorite.get();
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || f.getUserId() == null || !f.getUserId().equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(f);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getFavoritesByUser(@PathVariable Long userId) {
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || !userId.equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(favoriteRepository.findByUserId(userId));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> addFavorite(@Valid @RequestBody Favorite favorite) {
        // SECURITY: favorites are always tied to the authenticated user
        favorite.setUserId(CurrentUser.getId());
        Favorite saved = favoriteRepository.save(favorite);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> removeFavorite(@PathVariable Long id) {
        Optional<Favorite> existing = favoriteRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Favorite f = existing.get();
        Long currentUserId = CurrentUser.getId();
        if (!CurrentUser.isAdmin() && (currentUserId == null || f.getUserId() == null || !f.getUserId().equals(currentUserId))) {
            return ResponseEntity.notFound().build();
        }
        favoriteRepository.delete(f);
        return ResponseEntity.ok(Map.of("message", "Favorite removed"));
    }
}