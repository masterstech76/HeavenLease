package com.heavenlease.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.heavenlease.model.IntegrationConfig;

public interface IntegrationConfigRepository extends JpaRepository<IntegrationConfig, String> {
}