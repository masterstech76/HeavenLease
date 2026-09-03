package com.heavenlease.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.heavenlease.model.User;
import com.heavenlease.repository.UserRepository;

/**
 * AdminBootstrap must NEVER create an admin with a blank, weak, or
 * known-default password (e.g. the old docker-compose "ChangeMe123!").
 */
@SuppressWarnings({"unused", "null"}) // JUnit lifecycle + mock-null-typed matchers
class AdminBootstrapTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        when(userRepository.findAll()).thenReturn(List.of());
    }

    @Test
    void rejectsKnownDefaultPassword() {
        when(passwordEncoder.encode(any())).thenReturn("hash");
        // Simulate @Value injection by using reflection-free constructor? AdminBootstrap has no public constructor taking values,
        // so we set fields via reflection.
        AdminBootstrap bootstrap = new AdminBootstrap(userRepository, passwordEncoder);
        setField(bootstrap, "adminEmail", "admin@test.com");
        setField(bootstrap, "adminPassword", "ChangeMe123!");

        bootstrap.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsBlankPassword() {
        AdminBootstrap bootstrap = new AdminBootstrap(userRepository, passwordEncoder);
        setField(bootstrap, "adminEmail", "admin@test.com");
        setField(bootstrap, "adminPassword", "   ");

        bootstrap.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    void createsAdminWithStrongPassword() {
        when(passwordEncoder.encode("Str0ng!Passw0rd")).thenReturn("hash");
        AdminBootstrap bootstrap = new AdminBootstrap(userRepository, passwordEncoder);
        setField(bootstrap, "adminEmail", "admin@test.com");
        setField(bootstrap, "adminPassword", "Str0ng!Passw0rd");

        bootstrap.run();

        verify(userRepository).save(any(User.class));
    }

    private void setField(Object target, String field, Object value) {
        try {
            java.lang.reflect.Field f = target.getClass().getDeclaredField(field);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException | RuntimeException e) {
            throw new RuntimeException(e);
        }
    }
}