package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.BookingRepository;
import com.heavenlease.repository.FavoriteRepository;
import com.heavenlease.repository.LeaseRepository;
import com.heavenlease.repository.MessageRepository;
import com.heavenlease.repository.NotificationRepository;
import com.heavenlease.repository.OwnerApplicationRepository;
import com.heavenlease.repository.PaymentRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUserDetails;

/**
 * Self-service account lifecycle: deactivate (soft) and permanent deletion
 * must work on the current user only and clean up owned properties.
 */
@SuppressWarnings({"unused", "null"})
class AccountControllerTest {

    private UserRepository userRepository;
    private PropertyRepository propertyRepository;
    private BookingRepository bookingRepository;
    private LeaseRepository leaseRepository;
    private FavoriteRepository favoriteRepository;
    private NotificationRepository notificationRepository;
    private PaymentRepository paymentRepository;
    private OwnerApplicationRepository ownerApplicationRepository;
    private MessageRepository messageRepository;
    private AccountController controller;

    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        propertyRepository = mock(PropertyRepository.class);
        bookingRepository = mock(BookingRepository.class);
        leaseRepository = mock(LeaseRepository.class);
        favoriteRepository = mock(FavoriteRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        ownerApplicationRepository = mock(OwnerApplicationRepository.class);
        messageRepository = mock(MessageRepository.class);
        controller = new AccountController(userRepository, propertyRepository, bookingRepository, leaseRepository,
                favoriteRepository, notificationRepository, paymentRepository, ownerApplicationRepository,
                messageRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("tenant@example.com");
        testUser.setFullName("Tenant");
        testUser.setPhone("9876543210");
        testUser.setPasswordHash("$2a$10$abcdefghijklmnopqrstuvwxyz01");
        testUser.setRole(User.Role.TENANT);
        testUser.setVerified(false);

        authenticateAs(1L, "ROLE_TENANT");
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(Long id, String authority) {
        CurrentUserDetails user = new CurrentUserDetails(id, "user" + id + "@test.com", "hash",
                List.of(new SimpleGrantedAuthority(authority)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    @Test
    void deactivate_setsDeactivatedFlag() {
        var resp = controller.deactivate();

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(testUser.isDeactivated()).isTrue();
        verify(userRepository).save(testUser);
    }

    @Test
    void deactivate_twiceReturnsBadRequest() {
        testUser.setDeactivated(true);

        var resp = controller.deactivate();
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void deleteAccount_removesUserAndOwnedProperties() {
        Property p = new Property();
        p.setId(10L);
        p.setOwnerId(1L);
        when(propertyRepository.findByOwnerId(1L)).thenReturn(List.of(p));

        var resp = controller.deleteAccount();

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(propertyRepository).delete(p);
        verify(userRepository).delete(testUser);
    }

    @Test
    void deleteAccount_missingUserReturnsNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        var resp = controller.deleteAccount();
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}