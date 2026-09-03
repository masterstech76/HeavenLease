package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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

import com.heavenlease.model.MaintenanceRequest;
import com.heavenlease.model.Property;
import com.heavenlease.repository.MaintenanceRequestRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.security.CurrentUserDetails;
import com.heavenlease.service.NotificationService;

/**
 * Security-focused unit tests for the maintenance controller: the owner is
 * always resolved from the property server-side and only the owner (or admin)
 * can move a request's status.
 */
@SuppressWarnings({"unused", "null"})
class MaintenanceControllerTest {

    private MaintenanceRequestRepository repo;
    private PropertyRepository propertyRepository;
    private NotificationService notificationService;
    private MaintenanceController controller;

    @BeforeEach
    void setUp() {
        repo = mock(MaintenanceRequestRepository.class);
        propertyRepository = mock(PropertyRepository.class);
        notificationService = mock(NotificationService.class);
        controller = new MaintenanceController(repo, propertyRepository, notificationService);
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

    private Property sampleProperty(Long ownerId) {
        Property p = new Property();
        p.setId(10L);
        p.setOwnerId(ownerId);
        p.setTitle("Sunny 2BHK");
        return p;
    }

    @Test
    void create_resolvesOwnerFromPropertyAndNotifiesOwner() {
        authenticateAs(1L, "ROLE_TENANT");
        Property p = sampleProperty(2L);
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(p));
        when(repo.save(any(MaintenanceRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        MaintenanceRequest request = new MaintenanceRequest();
        request.setPropertyId(10L);
        request.setSubject("Leaky tap");
        request.setDescription("Tap drips in kitchen");
        request.setCategory("PLUMBING");
        request.setPriority("NORMAL");
        // A hostile client tries to set an arbitrary owner — must be ignored.
        request.setOwnerId(999L);

        var resp = controller.create(request);

        assertThat(resp.getStatusCode().value()).isEqualTo(201);
        MaintenanceRequest saved = (MaintenanceRequest) resp.getBody();
        assertThat(saved.getOwnerId()).isEqualTo(2L);
        assertThat(saved.getTenantId()).isEqualTo(1L);
        assertThat(saved.getStatus()).isEqualTo("OPEN");
        assertThat(saved.getPropertyTitle()).isEqualTo("Sunny 2BHK");
        verify(notificationService).notify(2L, "New Maintenance Request", "Leaky tap (PLUMBING, priority NORMAL)", "MAINTENANCE");
    }

    @Test
    void create_requiresProperty() {
        authenticateAs(1L, "ROLE_TENANT");
        MaintenanceRequest request = new MaintenanceRequest();
        request.setSubject("Broken AC");
        request.setDescription("AC not cooling");

        var resp = controller.create(request);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(repo, never()).save(any());
    }

    @Test
    void updateStatus_nonOwnerIsForbidden() {
        authenticateAs(1L, "ROLE_TENANT");
        MaintenanceRequest r = new MaintenanceRequest();
        r.setId(5L);
        r.setTenantId(1L);
        r.setOwnerId(2L);
        r.setSubject("Broken fan");
        r.setStatus("OPEN");
        when(repo.findById(5L)).thenReturn(Optional.of(r));

        var resp = controller.updateStatus(5L, Map.of("status", "IN_PROGRESS"));

        assertThat(resp.getStatusCode().value()).isEqualTo(403);
        verify(repo, never()).save(any());
    }

    @Test
    void updateStatus_ownerAdvancesAndNotifiesTenant() {
        authenticateAs(2L, "ROLE_OWNER");
        MaintenanceRequest r = new MaintenanceRequest();
        r.setId(5L);
        r.setTenantId(1L);
        r.setOwnerId(2L);
        r.setSubject("Broken fan");
        r.setStatus("OPEN");
        when(repo.findById(5L)).thenReturn(Optional.of(r));
        when(repo.save(any(MaintenanceRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        var resp = controller.updateStatus(5L, Map.of("status", "IN_PROGRESS", "resolutionNote", "Called electrician"));

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        MaintenanceRequest saved = (MaintenanceRequest) resp.getBody();
        assertThat(saved.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(saved.getResolutionNote()).isEqualTo("Called electrician");
        verify(notificationService).notify(1L, "Maintenance Update", "\"Broken fan\" is now IN_PROGRESS.", "MAINTENANCE");
    }

    @Test
    void updateStatus_rejectsUnknownStatus() {
        authenticateAs(2L, "ROLE_OWNER");
        MaintenanceRequest r = new MaintenanceRequest();
        r.setId(5L);
        r.setTenantId(1L);
        r.setOwnerId(2L);
        r.setSubject("Broken fan");
        r.setStatus("OPEN");
        when(repo.findById(5L)).thenReturn(Optional.of(r));

        var resp = controller.updateStatus(5L, Map.of("status", "SOMETIMES"));

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(repo, never()).save(any());
    }
}