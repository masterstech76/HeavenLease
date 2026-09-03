package com.heavenlease.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.heavenlease.model.PhoneOtp;

@Repository
public interface PhoneOtpRepository extends JpaRepository<PhoneOtp, Long> {

    Optional<PhoneOtp> findFirstByPhoneOrderByCreatedAtDesc(String phone);

    List<PhoneOtp> findByPhone(String phone);

    /** Removes old rows for a phone (called before issuing a fresh code). */
    @Modifying
    @Query("DELETE FROM PhoneOtp p WHERE p.phone = :phone")
    void deleteByPhone(@Param("phone") String phone);

    /** Opportunistic cleanup of expired rows so the table never grows forever. */
    @Modifying
    @Query("DELETE FROM PhoneOtp p WHERE p.expiresAt < :now")
    void deleteExpired(@Param("now") java.time.LocalDateTime now);
}