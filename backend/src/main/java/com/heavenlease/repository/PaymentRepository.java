package com.heavenlease.repository;

import com.heavenlease.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUserId(Long userId);
    List<Payment> findByPropertyId(Long propertyId);
    Optional<Payment> findFirstByUserIdAndActiveTrueOrderByCreatedAtDesc(Long userId);

    List<Payment> findByPaymentTypeAndStatus(String paymentType, String status);
    List<Payment> findByPaymentTypeAndUserId(String paymentType, Long userId);
    List<Payment> findByPaymentTypeAndOwnerId(String paymentType, Long ownerId);
    List<Payment> findByPaymentType(String paymentType);

    /** Active subscription payments (used by the renewal-reminder scheduler). */
    List<Payment> findByPaymentTypeAndActiveTrue(String paymentType);
}