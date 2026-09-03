package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.heavenlease.model.Payment;
import com.heavenlease.repository.PaymentRepository;
import com.heavenlease.security.CurrentUserDetails;
import com.heavenlease.service.PaymentGatewayService;
import com.heavenlease.service.PaymentGatewayService.OrderResult;

/**
 * Security-focused unit tests for the payments controller.
 *
 * Verifies that the plan amount + description are ALWAYS derived
 * server-side (a client can never self-grant a plan) and that
 * signature failures fail closed.
 */
@SuppressWarnings({"unused", "null"}) // JUnit lifecycle + null-typed response casts
class PaymentControllerTest {

    private PaymentRepository paymentRepository;
    private PaymentGatewayService gateway;
    private com.heavenlease.repository.PropertyRepository propertyRepository;
    private com.heavenlease.service.NotificationService notificationService;
    private com.heavenlease.repository.UserRepository userRepository;
    private PaymentController controller;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        gateway = mock(PaymentGatewayService.class);
        propertyRepository = mock(com.heavenlease.repository.PropertyRepository.class);
        notificationService = mock(com.heavenlease.service.NotificationService.class);
        userRepository = mock(com.heavenlease.repository.UserRepository.class);
        controller = new PaymentController(paymentRepository, gateway, propertyRepository, notificationService, userRepository);
        // Authenticate as TENANT user id=1.
        CurrentUserDetails user = new CurrentUserDetails(1L, "tenant@test.com", "hash",
                List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createOrder_usesServerPriceForValidPlan() {
        when(gateway.createOrder(any(), nullable(String.class), any())).thenReturn(new OrderResult(true, "order_123", "ok"));

        var resp = controller.createOrder(Map.of("planMonths", 6, "purpose", "subscription"));

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        verify(gateway).createOrder(eq(459.0d), nullable(String.class), any());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertThat(body.get("amount")).isEqualTo(459.0);
        assertThat(body.get("planMonths")).isEqualTo(6);
    }

    @Test
    void createOrder_rejectsInvalidPlan() {
        var resp = controller.createOrder(Map.of("planMonths", 99, "purpose", "subscription"));
        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        verify(gateway, never()).createOrder(any(), nullable(String.class), any());
    }

    @Test
    void createOrder_ignoresClientAmountForSubscriptions() {
        when(gateway.createOrder(any(), nullable(String.class), any())).thenReturn(new OrderResult(true, "order_123", "ok"));

        var resp = controller.createOrder(Map.of("planMonths", 12, "amount", 1, "purpose", "subscription"));

        verify(gateway).createOrder(eq(799.0d), nullable(String.class), any());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertThat(body.get("amount")).isEqualTo(799.0);
    }

    @Test
    void verifyPayment_derivesDescriptionAndAmountServerSide() {
        when(gateway.verifyPaymentSignature("o1", "p1", "sig")).thenReturn(true);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        var resp = controller.verifyPayment(Map.of(
                "orderId", "o1", "paymentId", "p1", "signature", "sig", "planMonths", "12"));

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        Payment saved = (Payment) ((Map<?, ?>) resp.getBody()).get("payment");
        assertThat(saved.getAmount()).isEqualTo(799.0);
        assertThat(saved.getPaymentType()).isEqualTo("SUBSCRIPTION");
        assertThat(saved.getDescription()).contains("plan:12").contains("tenant");
        assertThat(saved.getUserId()).isEqualTo(1L);
    }

    @Test
    void verifyPayment_rejectsClientAmountAndDescription() {
        when(gateway.verifyPaymentSignature("o1", "p1", "sig")).thenReturn(true);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        var resp = controller.verifyPayment(Map.of(
                "orderId", "o1", "paymentId", "p1", "signature", "sig",
                "planMonths", "12", "amount", "1", "description", "plan:12 role:owner"));

        Payment saved = (Payment) ((Map<?, ?>) resp.getBody()).get("payment");
        assertThat(saved.getAmount()).isEqualTo(799.0);
        assertThat(saved.getDescription()).contains("plan:12").contains("tenant");
        assertThat(saved.getDescription()).doesNotContain("role:owner");
    }

    @Test
    void verifyPayment_failsClosedOnBadSignature() {
        when(gateway.verifyPaymentSignature("o1", "p1", "bad")).thenReturn(false);

        var resp = controller.verifyPayment(Map.of(
                "orderId", "o1", "paymentId", "p1", "signature", "bad", "planMonths", "12"));

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void verifyPayment_doesNotGrantPlanForMissingPlanMonths() {
        when(gateway.verifyPaymentSignature("o1", "p1", "sig")).thenReturn(true);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        var resp = controller.verifyPayment(Map.of(
                "orderId", "o1", "paymentId", "p1", "signature", "sig"));

        Payment saved = (Payment) ((Map<?, ?>) resp.getBody()).get("payment");
        assertThat(saved.getDescription()).isEqualTo("online payment");
        assertThat(saved.getPaymentType()).isEqualTo("ONLINE");
    }
}
