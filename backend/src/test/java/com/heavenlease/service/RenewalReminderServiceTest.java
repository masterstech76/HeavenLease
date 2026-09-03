package com.heavenlease.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.heavenlease.model.Payment;
import com.heavenlease.repository.PaymentRepository;

/** Unit tests for the scheduled subscription-renewal in-app reminders. */
@SuppressWarnings({"unused", "null"})
class RenewalReminderServiceTest {

    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final RenewalReminderService service =
            new RenewalReminderService(paymentRepository, notificationService);

    private Payment activeSubscription(LocalDateTime createdAt, String description) {
        Payment p = new Payment();
        p.setUserId(1L);
        p.setPaymentType("SUBSCRIPTION");
        p.setActive(true);
        p.setCreatedAt(createdAt);
        p.setDescription(description);
        return p;
    }

    @Test
    void parsePlanMonths_extractsFromDescription() {
        assertThat(RenewalReminderService.parsePlanMonths("plan:6 role:tenant")).isEqualTo(6);
        assertThat(RenewalReminderService.parsePlanMonths("online payment")).isNull();
    }

    @Test
    void sendsReminderForSubscriptionExpiringWithin7Days() {
        // 6-month plan created ~5.5 months ago -> expires in ~6 days -> should remind.
        Payment p = activeSubscription(LocalDateTime.now().minusMonths(5).minusDays(24), "plan:6 role:tenant");
        when(paymentRepository.findByPaymentTypeAndActiveTrue("SUBSCRIPTION")).thenReturn(List.of(p));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> (Payment) inv.getArgument(0));

        service.sendRenewalReminders();

        verify(notificationService).notify(eq(1L), eq("Your Access Pass Expires Soon"), any(), eq("RENEWAL"));
        assertThat(p.getLastRenewalReminderAt()).isNotNull();
    }

    @Test
    void doesNotRemindAgainAfterFirstReminder() {
        Payment p = activeSubscription(LocalDateTime.now().minusMonths(5).minusDays(24), "plan:6 role:tenant");
        p.setLastRenewalReminderAt(LocalDateTime.now().minusDays(1));
        when(paymentRepository.findByPaymentTypeAndActiveTrue("SUBSCRIPTION")).thenReturn(List.of(p));

        service.sendRenewalReminders();

        verify(notificationService, never()).notify(any(), any(), any(), any());
    }

    @Test
    void doesNotRemindWhenNotCloseToExpiry() {
        // 12-month plan created 1 month ago -> 11 months left -> no reminder.
        Payment p = activeSubscription(LocalDateTime.now().minusMonths(1), "plan:12 role:tenant");
        when(paymentRepository.findByPaymentTypeAndActiveTrue("SUBSCRIPTION")).thenReturn(List.of(p));

        service.sendRenewalReminders();

        verify(notificationService, never()).notify(any(), any(), any(), any());
    }

    @Test
    void doesNotRemindAlreadyExpired() {
        // 1-month plan created 2 months ago -> expired -> no reminder.
        Payment p = activeSubscription(LocalDateTime.now().minusMonths(2), "plan:1 role:tenant");
        when(paymentRepository.findByPaymentTypeAndActiveTrue("SUBSCRIPTION")).thenReturn(List.of(p));

        service.sendRenewalReminders();

        verify(notificationService, never()).notify(any(), any(), any(), any());
    }
}