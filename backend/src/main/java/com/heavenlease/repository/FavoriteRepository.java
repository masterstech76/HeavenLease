package com.heavenlease.repository;

import com.heavenlease.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUserId(Long userId);
    List<Favorite> findByPropertyId(Long propertyId);
    Optional<Favorite> findByUserIdAndPropertyId(Long userId, Long propertyId);
}