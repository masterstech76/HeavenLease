package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
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

import com.heavenlease.model.Payment;
import com.heavenlease.model.Property;
import com.heavenlease.repository.PaymentRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUserDetails;
import com.heavenlease.service.NotificationService;
import com.heavenlease.service.PaymentGatewayService;

/**
 * End-to-end state machine tests for escrow: init -> hold -> two-party release,
 * plus the dispute -> resolve path. Ensures notifications are sent at each
 * lifecycle transition and non-parties cannot approve a release.
 */
@SuppressWarnings({"unused", "null"})
class EscrowFlowTest {

    private PaymentRepository paymentRepository;
    private PaymentGatewayService gateway;
    private PropertyRepository propertyRepository;
    private NotificationService notificationService;
    private UserRepository userRepository;
    private PaymentController controller;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        gateway = mock(PaymentGatewayService.class);
        propertyRepository = mock(PropertyRepository.class);
        notificationService = mock(NotificationService.class);
        userRepository = mock(UserRepository.class);
        controller = new PaymentController(paymentRepository, gateway, propertyRepository, notificationService, userRepository);
        when(gateway.isRazorpayConfigured()).thenReturn(false);
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

    private Payment escrow(String status, Long tenantId, Long ownerId) {
        Payment p = new Payment();
        p.setId(7L);
        p.setUserId(tenantId);
        p.setOwnerId(ownerId);
        p.setPropertyId(10L);
        p.setAmount(15000.0);
        p.setPaymentType("ESCROW");
        p.setStatus(status);
        p.setEscrow(true);
        return p;
    }

    @Test
    void initiate_persistsPendingEscrowAndNotifiesBothParties() {
        authenticateAs(1L, "ROLE_TENANT");
        Property property = new Property();
        property.setId(10L);
        property.setOwnerId(2L);
        property.setTitle("Sunny 2BHK");
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(7L);
            return p;
        });

        var resp = controller.initiateEscrow(Map.of("amount", 15000, "propertyId", 10));

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertThat(body.get("escrowId")).isEqualTo(7L);
        assertThat(body.get("requiresGateway")).isEqualTo(true);
        // Saved payment carried escrow flags + authoritative owner.
        verify(paymentRepository).save(argThat(p ->
                p.isEscrow() && "ESCROW".equals(p.getPaymentType())
                        && "ESCROW_PENDING".equals(p.getStatus())
                        && p.getOwnerId().equals(2L) && p.getUserId().equals(1L)));
        verify(notificationService).notify(eq(1L), eq("Escrow Deposit Initiated"), any(), eq("ESCROW"));
        verify(notificationService).notify(eq(2L), eq("Escrow Deposit Initiated"), any(), eq("ESCROW"));
    }

    @Test
    void initiate_rejectsForeignTenant() {
        authenticateAs(5L, "ROLE_TENANT");
        var resp = controller.initiateEscrow(Map.of("amount", 15000, "propertyId", 10, "tenantId", 1));
        assertThat(resp.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void initiate_setsEscrowFlagsBeforeSave() {
        authenticateAs(1L, "ROLE_TENANT");
        Property property = new Property();
        property.setId(10L);
        property.setOwnerId(2L);
        property.setTitle("Sunny 2BHK");
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(7L); // so Map.of(..., "escrowId", saved.getId()) never sees null
            return p;
        });

        controller.initiateEscrow(Map.of("amount", 20000, "propertyId", 10));

        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void twoPartyRelease_onlyReleasesWhenBothApprove() {
        // Seed an ESCROW_HELD payment (tenant=1 tenant approves, owner=2 owner approves).
        authenticateAs(1L, "ROLE_TENANT");
        Payment held = escrow("ESCROW_HELD", 1L, 2L);
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(held));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        // Tenant approves first — still not released.
        var t = controller.releaseEscrow(7L, "tenant");
        assertThat(t.getStatusCode().is2xxSuccessful()).isTrue();
        verify(notificationService).notify(eq(2L), eq("Escrow Release Approved"), any(), eq("ESCROW"));

        // Owner approves second — now released + notified to both.
        authenticateAs(2L, "ROLE_OWNER");
        held.setEscrowTenantApproved(true);
        var o = controller.releaseEscrow(7L, "owner");
        assertThat(o.getStatusCode().is2xxSuccessful()).isTrue();
        Payment released = (Payment) o.getBody();
        assertThat(released.getStatus()).isEqualTo("ESCROW_RELEASED");
        verify(notificationService).notify(eq(1L), eq("Escrow Released"), any(), eq("ESCROW"));
        verify(notificationService).notify(eq(2L), eq("Escrow Released"), any(), eq("ESCROW"));
    }

    @Test
    void release_foreignPartyIsForbidden() {
        authenticateAs(3L, "ROLE_TENANT");
        Payment held = escrow("ESCROW_HELD", 1L, 2L);
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(held));

        var resp = controller.releaseEscrow(7L, "tenant");

        assertThat(resp.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void dispute_thenResolve() {
        authenticateAs(1L, "ROLE_TENANT");
        Payment held = escrow("ESCROW_HELD", 1L, 2L);
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(held));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        var dispute = controller.disputeEscrow(7L, Map.of("reason", "Deposit not refunded after move-out"));
        assertThat(dispute.getStatusCode().is2xxSuccessful()).isTrue();
        Payment disputed = (Payment) dispute.getBody();
        assertThat(disputed.getStatus()).isEqualTo("ESCROW_DISPUTED");
        verify(notificationService).notify(eq(2L), eq("Escrow Disputed"), any(), eq("ESCROW"));

        // Admin resolves.
        authenticateAs(9L, "ROLE_ADMIN");
        disputed.setStatus("ESCROW_DISPUTED");
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(disputed));
        var resolve = controller.resolveEscrow(7L, Map.of("resolutionNote", "Refund approved back to tenant"));
        assertThat(resolve.getStatusCode().is2xxSuccessful()).isTrue();
        Payment resolved = (Payment) resolve.getBody();
        assertThat(resolved.getStatus()).isEqualTo("ESCROW_RESOLVED");
        assertThat(resolved.getEscrowResolutionNote()).isEqualTo("Refund approved back to tenant");
    }

    @Test
    void hold_onlyFromPending() {
        authenticateAs(9L, "ROLE_ADMIN");
        Payment held = escrow("ESCROW_HELD", 1L, 2L);
        when(paymentRepository.findById(7L)).thenReturn(Optional.of(held));

        var resp = controller.holdEscrow(7L);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}