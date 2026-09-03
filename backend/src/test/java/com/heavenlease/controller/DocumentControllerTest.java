package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.heavenlease.model.DocumentUpload;
import com.heavenlease.model.Property;
import com.heavenlease.repository.DocumentUploadRepository;
import com.heavenlease.repository.NotificationRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUserDetails;

/**
 * IDOR (Insecure Direct Object Reference) regression tests.
 *
 * A user must ONLY ever see documents they own (or that are linked to
 * their own properties) — never every user's PII documents.
 */
@SuppressWarnings({"unused", "null"}) // JUnit lifecycle + mock-null-typed matchers
class DocumentControllerTest {

    private DocumentUploadRepository documentRepository;
    private UserRepository userRepository;
    private PropertyRepository propertyRepository;
    private NotificationRepository notificationRepository;
    private DocumentController controller;

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentUploadRepository.class);
        userRepository = mock(UserRepository.class);
        propertyRepository = mock(PropertyRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        controller = new DocumentController(documentRepository, userRepository, propertyRepository, notificationRepository);
    }

    private void loginAs(Long id, String role) {
        CurrentUserDetails user = new CurrentUserDetails(id, "u" + id + "@test.com", "hash",
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void byPage_nonAdminOnlySeesOwnDocuments() {
        loginAs(7L, "TENANT");
        when(documentRepository.findByUserIdAndPageKey(7L, "identity"))
                .thenReturn(new ArrayList<>(List.of(new DocumentUpload())));

        controller.byPage("identity");

        // Must query by OWN user id — never everyone's documents.
        verify(documentRepository).findByUserIdAndPageKey(7L, "identity");
        verify(documentRepository, never()).findByPageKey("identity");
    }

    @Test
    void received_ownerOnlySeesDocsForOwnedProperties() {
        loginAs(3L, "VERIFIED_OWNER");
        Property p1 = new Property();
        p1.setId(101L);
        p1.setOwnerId(3L);
        when(propertyRepository.findByOwnerId(3L)).thenReturn(new ArrayList<>(List.of(p1)));
        when(documentRepository.findByPropertyIdIn(List.of(101L))).thenReturn(new ArrayList<>(List.of(new DocumentUpload())));
        when(documentRepository.findByUserId(3L)).thenReturn(new ArrayList<>());

        controller.received();

        // Must scope to OWNED property ids, never every document.
        verify(documentRepository).findByPropertyIdIn(List.of(101L));
        verify(documentRepository, never()).findAll();
    }

    @Test
    void received_ownerWithNoPropertiesSeesOnlyOwnUploads() {
        loginAs(5L, "OWNER");
        when(propertyRepository.findByOwnerId(5L)).thenReturn(new ArrayList<>());
        when(documentRepository.findByUserId(5L)).thenReturn(new ArrayList<>(List.of(new DocumentUpload())));

        var resp = controller.received();

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        // Owner without properties still sees their own uploads, and never others'.
        verify(documentRepository).findByUserId(5L);
        verify(documentRepository, never()).findAll();
        verify(documentRepository, never()).findByPropertyIdIn(List.of());
    }

    @Test
    void byPage_adminCanSeeAllDocumentsForPage() {
        loginAs(1L, "ADMIN");
        when(documentRepository.findByPageKey("tax")).thenReturn(new ArrayList<>(List.of(new DocumentUpload())));

        var resp = controller.byPage("tax");

        verify(documentRepository).findByPageKey("tax");
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
    }
}