package com.heavenlease.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.heavenlease.model.Property;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByOwnerId(Long ownerId);

    List<Property> findByStatus(String status);

    /**
     * Atomically increments the view counter for a property. Stored in the
     * database so the value survives restarts and needs no external service.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Property p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Query("SELECT COUNT(p) FROM Property p WHERE p.status = 'active'")
    long countActive();

    long countDistinctByCity(String city);

    @Query("SELECT COUNT(DISTINCT p.city) FROM Property p")
    long countCities();

    @Query("SELECT COALESCE(SUM(p.viewCount), 0) FROM Property p")
    long sumViewCount();

    @Query("SELECT p FROM Property p WHERE "
            + "(:status IS NULL OR p.status = :status) AND "
            + "(:city IS NULL OR LOWER(p.city) LIKE LOWER(CONCAT('%', :city, '%'))) AND "
            + "(:propertyType IS NULL OR p.propertyType = :propertyType) AND "
            + "(:minRent IS NULL OR p.rentAmount >= :minRent) AND "
            + "(:maxRent IS NULL OR p.rentAmount <= :maxRent) AND "
            + "(:bhk IS NULL OR p.bhk = :bhk) AND "
            + "(:petFriendly IS NULL OR p.petFriendly = :petFriendly) AND "
            + "(:furnished IS NULL OR p.furnished = :furnished) AND "
            + "(:minQuietness IS NULL OR p.quietness >= :minQuietness) AND "
            + "(:minSunlight IS NULL OR p.sunlight >= :minSunlight) AND "
            + "(:maxCommute IS NULL OR p.commute <= :maxCommute)")
    List<Property> searchProperties(
            @Param("status") String status,
            @Param("city") String city,
            @Param("propertyType") String propertyType,
            @Param("minRent") Double minRent,
            @Param("maxRent") Double maxRent,
            @Param("bhk") Integer bhk,
            @Param("petFriendly") Boolean petFriendly,
            @Param("furnished") Boolean furnished,
            @Param("minQuietness") Integer minQuietness,
            @Param("minSunlight") Integer minSunlight,
            @Param("maxCommute") Integer maxCommute);

    @Query("SELECT p FROM Property p WHERE "
            + "(:status IS NULL OR p.status = :status) AND "
            + "(:city IS NULL OR LOWER(p.city) LIKE LOWER(CONCAT('%', :city, '%'))) AND "
            + "(:propertyType IS NULL OR p.propertyType = :propertyType) AND "
            + "(:minRent IS NULL OR p.rentAmount >= :minRent) AND "
            + "(:maxRent IS NULL OR p.rentAmount <= :maxRent) AND "
            + "(:bhk IS NULL OR p.bhk = :bhk) AND "
            + "(:petFriendly IS NULL OR p.petFriendly = :petFriendly) AND "
            + "(:furnished IS NULL OR p.furnished = :furnished) AND "
            + "(:minQuietness IS NULL OR p.quietness >= :minQuietness) AND "
            + "(:minSunlight IS NULL OR p.sunlight >= :minSunlight) AND "
            + "(:maxCommute IS NULL OR p.commute <= :maxCommute)")
    Page<Property> searchProperties(
            @Param("status") String status,
            @Param("city") String city,
            @Param("propertyType") String propertyType,
            @Param("minRent") Double minRent,
            @Param("maxRent") Double maxRent,
            @Param("bhk") Integer bhk,
            @Param("petFriendly") Boolean petFriendly,
            @Param("furnished") Boolean furnished,
            @Param("minQuietness") Integer minQuietness,
            @Param("minSunlight") Integer minSunlight,
            @Param("maxCommute") Integer maxCommute,
            Pageable pageable);
}
