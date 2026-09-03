package com.heavenlease.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "properties")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private Long ownerId;

    @Column(length = 500)
    private String address;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(length = 100)
    private String locality;

    @Column(nullable = false)
    private Double rentAmount;

    @Column(nullable = false)
    private Double deposit;

    @Column(nullable = false)
    private Integer bhk;

    @Column(nullable = false, length = 20)
    private String propertyType;

    @Column(nullable = false)
    private boolean petFriendly;

    @Column(nullable = false)
    private boolean furnished;

    @Column(nullable = false)
    private Integer quietness;

    @Column(nullable = false)
    private Integer sunlight;

    @Column(nullable = false)
    private Integer commute;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "property_amenities", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "amenity", length = 100)
    private List<String> amenities = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "property_photos", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "photo_url", length = 1000)
    private List<String> photos = new ArrayList<>();

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, length = 20)
    private String status;

    /** True when the owner is selling the property rather than renting. */
    @Column(nullable = false)
    private boolean forSale = false;

    /** Optional asking price when the property is listed for sale. */
    private Double salePrice;

    @Column(length = 20)
    private String availableFrom;

    @Column(length = 20)
    private String leaseDuration;

    private Double lat;

    private Double lng;

    @Column(length = 100)
    private String ownerName;

    @Column(length = 20)
    private String ownerPhone;

    @Column(length = 100)
    private String ownerEmail;

    @Column(nullable = false, length = 20)
    private String icon;

    @Column(nullable = false, length = 50)
    private String badge;

    @Column(nullable = false)
    private long viewCount = 0L;

    @Column(nullable = false)
    private boolean isDemo = false;

    /**
     * Transient API flag — signals the frontend that this viewer has no active
     * subscription so the owner's contact details have been masked. Never
     * persisted to the database.
     */
    @Transient
    private Boolean contactLocked;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Property() {
    }

    public Property(Long id, String title, Long ownerId, String address, String city, String locality, Double rentAmount, Double deposit, Integer bhk, String propertyType, boolean petFriendly, boolean furnished, Integer quietness, Integer sunlight, Integer commute, List<String> amenities, List<String> photos, String description, String status, String availableFrom, String leaseDuration, Double lat, Double lng, String ownerName, String ownerPhone, String ownerEmail, String icon, String badge, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.ownerId = ownerId;
        this.address = address;
        this.city = city;
        this.locality = locality;
        this.rentAmount = rentAmount;
        this.deposit = deposit;
        this.bhk = bhk;
        this.propertyType = propertyType;
        this.petFriendly = petFriendly;
        this.furnished = furnished;
        this.quietness = quietness;
        this.sunlight = sunlight;
        this.commute = commute;
        this.amenities = amenities != null ? amenities : new ArrayList<>();
        this.photos = photos != null ? photos : new ArrayList<>();
        this.description = description;
        this.status = status;
        this.availableFrom = availableFrom;
        this.leaseDuration = leaseDuration;
        this.lat = lat;
        this.lng = lng;
        this.ownerName = ownerName;
        this.ownerPhone = ownerPhone;
        this.ownerEmail = ownerEmail;
        this.icon = icon;
        this.badge = badge;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getLocality() { return locality; }
    public void setLocality(String locality) { this.locality = locality; }
    public Double getRentAmount() { return rentAmount; }
    public void setRentAmount(Double rentAmount) { this.rentAmount = rentAmount; }
    public Double getDeposit() { return deposit; }
    public void setDeposit(Double deposit) { this.deposit = deposit; }
    public Integer getBhk() { return bhk; }
    public void setBhk(Integer bhk) { this.bhk = bhk; }
    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }
    public boolean isPetFriendly() { return petFriendly; }
    public void setPetFriendly(boolean petFriendly) { this.petFriendly = petFriendly; }
    public boolean isFurnished() { return furnished; }
    public void setFurnished(boolean furnished) { this.furnished = furnished; }
    public Integer getQuietness() { return quietness; }
    public void setQuietness(Integer quietness) { this.quietness = quietness; }
    public Integer getSunlight() { return sunlight; }
    public void setSunlight(Integer sunlight) { this.sunlight = sunlight; }
    public Integer getCommute() { return commute; }
    public void setCommute(Integer commute) { this.commute = commute; }
    public List<String> getAmenities() { return amenities; }
    public void setAmenities(List<String> amenities) { this.amenities = amenities; }
    public List<String> getPhotos() { return photos; }
    public void setPhotos(List<String> photos) { this.photos = photos; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isForSale() { return forSale; }
    public void setForSale(boolean forSale) { this.forSale = forSale; }
    public Double getSalePrice() { return salePrice; }
    public void setSalePrice(Double salePrice) { this.salePrice = salePrice; }
    public String getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(String availableFrom) { this.availableFrom = availableFrom; }
    public String getLeaseDuration() { return leaseDuration; }
    public void setLeaseDuration(String leaseDuration) { this.leaseDuration = leaseDuration; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public String getOwnerPhone() { return ownerPhone; }
    public void setOwnerPhone(String ownerPhone) { this.ownerPhone = ownerPhone; }
    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }
    public long getViewCount() { return viewCount; }
    public void setViewCount(long viewCount) { this.viewCount = viewCount; }
    public boolean isDemo() { return isDemo; }
    public void setDemo(boolean demo) { isDemo = demo; }
    public Boolean getContactLocked() { return contactLocked; }
    public void setContactLocked(Boolean contactLocked) { this.contactLocked = contactLocked; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}