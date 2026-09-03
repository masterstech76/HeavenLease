package com.heavenlease.repository;

import com.heavenlease.model.Feedback;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByPageKey(String pageKey);
    List<Feedback> findByUserId(Long userId);
    List<Feedback> findByPageKeyOrderByCreatedAtDesc(String pageKey);

    @Query("SELECT AVG(f.stars) FROM Feedback f WHERE f.pageKey = :pageKey")
    Double averageStars(@Param("pageKey") String pageKey);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.pageKey = :pageKey")
    long countByPageKey(@Param("pageKey") String pageKey);
}