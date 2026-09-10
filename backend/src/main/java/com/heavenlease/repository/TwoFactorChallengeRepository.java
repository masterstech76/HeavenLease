package com.heavenlease.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.heavenlease.model.TwoFactorChallenge;

public interface TwoFactorChallengeRepository extends JpaRepository<TwoFactorChallenge, Long> {
    Optional<TwoFactorChallenge> findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(Long userId);
}
