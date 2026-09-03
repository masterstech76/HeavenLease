package com.heavenlease.repository;

import com.heavenlease.model.OwnerApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OwnerApplicationRepository extends JpaRepository<OwnerApplication, Long> {
    List<OwnerApplication> findByUserId(Long userId);
}