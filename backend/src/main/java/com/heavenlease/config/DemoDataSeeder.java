package com.heavenlease.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;

/**
 * Seeds clearly-marked DEMO accounts + listings for local/dev evaluation only.
 *
 * Disabled by default so a CLEAN production database is never polluted with fake
 * data. Enable it only for development by setting:
 *
 *   app.seed-demo: true   (see application-dev.yml)
 *
 * Everything created here is flagged is_demo = true and can be wiped with:
 *
 *   DELETE FROM properties WHERE is_demo = TRUE;
 *   DELETE FROM users WHERE email IN ('owner@demo.com','tenant@demo.com');
 *
 * The buyer replaces these with real owners/tenants and their own listings.
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-demo:false}")
    private boolean seedDemo;

    public DemoDataSeeder(UserRepository userRepository, PropertyRepository propertyRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.propertyRepository = propertyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedDemo) {
            log.info("Demo data seeding disabled (app.seed-demo=false). Production stays clean.");
            return;
        }
        seedDemoUsers();
        seedDemoProperties();
    }

    private void seedDemoUsers() {
        if (!userRepository.existsByEmail("owner@demo.com")) {
            User owner = new User();
            owner.setEmail("owner@demo.com");
            owner.setFullName("Demo Owner");
            owner.setPhone("9876500001");
            owner.setPasswordHash(passwordEncoder.encode("Demo@12345"));
            owner.setRole(User.Role.VERIFIED_OWNER);
            owner.setVerified(true);
            userRepository.save(owner);
            log.info("Seeded demo OWNER account owner@demo.com / Demo@12345");
        }
        if (!userRepository.existsByEmail("tenant@demo.com")) {
            User tenant = new User();
            tenant.setEmail("tenant@demo.com");
            tenant.setFullName("Demo Tenant");
            tenant.setPhone("9876500002");
            tenant.setPasswordHash(passwordEncoder.encode("Demo@12345"));
            tenant.setRole(User.Role.TENANT);
            tenant.setVerified(true);
            userRepository.save(tenant);
            log.info("Seeded demo TENANT account tenant@demo.com / Demo@12345");
        }
    }

    private void seedDemoProperties() {
        User owner = userRepository.findByEmail("owner@demo.com").orElse(null);
        if (owner == null) return;
        long existing = propertyRepository.count();
        if (existing > 0) return;
        createDemoProperty(owner.getId(), "Sunny 2BHK in Indiranagar", "100, 12th Main, Indiranagar",
                "Indiranagar", 28000.0, 100000.0, 2, true, true, 85, 90, 75, 12.9784, 77.6408);
        createDemoProperty(owner.getId(), "Cozy 1BHK Near Koramangala", "5th Block, Koramangala",
                "Koramangala", 18500.0, 75000.0, 1, false, true, 70, 60, 55, 12.9352, 77.6245);
        createDemoProperty(owner.getId(), "Spacious 3BHK with Balcony", "Whitefield Main Road",
                "Whitefield", 38000.0, 180000.0, 3, true, true, 65, 70, 60, 12.9698, 77.7499);
        createDemoProperty(owner.getId(), "Modern Studio Near HSR Layout", "27th Main, Sector 1, HSR Layout",
                "HSR Layout", 22000.0, 50000.0, 1, false, false, 80, 50, 70, 12.9116, 77.6465);
        createDemoProperty(owner.getId(), "3BHK Luxury Villa with Garden", "Sarjapur Road, Outer Ring Road",
                "Sarjapur Road", 45000.0, 250000.0, 3, true, true, 55, 75, 45, 12.9214, 77.6561);
        log.info("Seeded 5 demo property listings (is_demo=true).");
    }

    private void createDemoProperty(Long ownerId, String title, String address, String locality,
                                    double rent, double deposit, int bhk, boolean pet, boolean furnished,
                                    int quiet, int sun, int commute, double lat, double lng) {
        Property p = new Property();
        p.setTitle(title);
        p.setOwnerId(ownerId);
        p.setAddress(address);
        p.setCity("Bengaluru");
        p.setLocality(locality);
        p.setRentAmount(rent);
        p.setDeposit(deposit);
        p.setBhk(bhk);
        p.setPropertyType("Apartment");
        p.setPetFriendly(pet);
        p.setFurnished(furnished);
        p.setQuietness(quiet);
        p.setSunlight(sun);
        p.setCommute(commute);
        p.setStatus("active");
        p.setLat(lat);
        p.setLng(lng);
        p.setOwnerName("Demo Owner");
        p.setOwnerPhone("9876500001");
        p.setOwnerEmail("owner@demo.com");
        p.setIcon("fa-building");
        p.setBadge("Verified Owner");
        p.setViewCount(0);
        p.setDemo(true);
        propertyRepository.save(p);
    }
}