package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

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
 * Profile edit flows: save allowed fields (with phone/website normalization),
 * reject invalid data, and enforce the current password when changing it.
 */
@SuppressWarnings({"unused", "null"})
class UserControllerTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private BookingRepository bookingRepository;
    private LeaseRepository leaseRepository;
    private FavoriteRepository favoriteRepository;
    private NotificationRepository notificationRepository;
    private PaymentRepository paymentRepository;
    private OwnerApplicationRepository ownerApplicationRepository;
    private MessageRepository messageRepository;
    private PropertyRepository propertyRepository;
    private UserController controller;

    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        bookingRepository = mock(BookingRepository.class);
        leaseRepository = mock(LeaseRepository.class);
        favoriteRepository = mock(FavoriteRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        ownerApplicationRepository = mock(OwnerApplicationRepository.class);
        messageRepository = mock(MessageRepository.class);
        propertyRepository = mock(PropertyRepository.class);
        controller = new UserController(userRepository, passwordEncoder, bookingRepository, leaseRepository,
                favoriteRepository, notificationRepository, paymentRepository, ownerApplicationRepository,
                messageRepository, propertyRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
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
    void updateUser_savesAllowedFieldsAndNormalizesInput() {
        var resp = controller.updateUser(1L, Map.of(
                "fullName", "Updated Name",
                "phone", "+91 98765 12345",
                "username", "updated_user",
                "bio", "Hello!",
                "website", "example.com",
                "gender", "male"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        User saved = (User) resp.getBody();
        assertThat(saved.getFullName()).isEqualTo("Updated Name");
        assertThat(saved.getPhone()).isEqualTo("9876512345");
        assertThat(saved.getUsername()).isEqualTo("updated_user");
        assertThat(saved.getBio()).isEqualTo("Hello!");
        assertThat(saved.getWebsite()).isEqualTo("https://example.com");
        assertThat(saved.getGender()).isEqualTo("male");
        // Verify the spread of captured field updates actually persisted on the row.
        verify(userRepository).save(testUser);
    }

    @Test
    void updateUser_rejectsInvalidPhone() {
        var resp = controller.updateUser(1L, Map.of("phone", "12345"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateUser_rejectsTakenUsername() {
        User clash = new User();
        clash.setId(99L);
        clash.setUsername("taken_user");
        when(userRepository.findByUsername("taken_user")).thenReturn(Optional.of(clash));

        var resp = controller.updateUser(1L, Map.of("username", "taken_user"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateUser_rejectsInvalidWebsiteUrl() {
        var resp = controller.updateUser(1L, Map.of("website", "not a url"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
@Test
    void updatePassword_rejectsWrongCurrentPassword() {
        when(passwordEncoder.matches("wrong", testUser.getPasswordHash())).thenReturn(false);

        var resp = controller.updatePassword(1L, Map.of(
                "password", "newpass123", "currentPassword", "wrong"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // Password hash must remain untouched after a rejected change.
        assertThat(testUser.getPasswordHash()).isEqualTo("$2a$10$abcdefghijklmnopqrstuvwxyz01");
    }

    @Test
    void updatePassword_updatesWithCorrectCurrentPassword() {
        when(passwordEncoder.matches("oldpass", testUser.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.encode("newpass123")).thenReturn("encoded-new");

        var resp = controller.updatePassword(1L, Map.of(
                "password", "newpass123", "currentPassword", "oldpass"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(testUser.getPasswordHash()).isEqualTo("encoded-new");
    }

    @Test
    void updatePassword_allowsFirstPasswordForGoogleOnlyAccount() {
        // Google sign-ins store a random (non-BCrypt) hash; setting a first password
        // must be allowed even though no "current password" exists to verify.
        testUser.setPasswordHash(java.util.UUID.randomUUID().toString());

        var resp = controller.updatePassword(1L, Map.of(
                "password", "newpass123", "currentPassword", "anything"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void updatePassword_requiresStrongPassword() {
        var resp = controller.updatePassword(1L, Map.of("password", "short"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}