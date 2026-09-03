package com.heavenlease.repository;

import com.heavenlease.model.Lease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaseRepository extends JpaRepository<Lease, Long> {
    List<Lease> findByPropertyId(Long propertyId);
    List<Lease> findByTenantId(Long tenantId);
    List<Lease> findByOwnerId(Long ownerId);
}