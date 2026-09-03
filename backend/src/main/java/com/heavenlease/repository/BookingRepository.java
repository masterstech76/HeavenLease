package com.heavenlease.repository;

import com.heavenlease.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByPropertyId(Long propertyId);
    List<Booking> findByTenantId(Long tenantId);
    List<Booking> findByOwnerId(Long ownerId);
}