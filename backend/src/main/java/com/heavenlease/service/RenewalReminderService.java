package com.heavenlease.service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.heavenlease.model.Payment;
import com.heavenlease.repository.PaymentRepository;

/**
 * Sends in-app "your Access Pass expires soon" reminders.
 *
 * Runs every 6 hours and scans active subscription payments whose expiry
 * (createdAt + plan months) is within the next 7 days. Each payment only gets
 * one reminder: the lastRenewalReminderAt timestamp guards against duplicates.
 * (Email reminders are intentionally a no-op here — they require AWS SES, which
 * this deployment has deferred. The Notification center is the channel.)
 */
@Service
public class RenewalReminderService {

    private static final Logger log = LoggerFactory.getLogger(RenewalReminderService.class);
    private static final int REMIND_BEFORE_DAYS = 7;

    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;

    public RenewalReminderService(PaymentRepository paymentRepository, NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedDelay = 6 * 60 * 60 * 1000) // every 6 hours
    @Transactional
    public void sendRenewalReminders() {
        List<Payment> active = paymentRepository.findByPaymentTypeAndActiveTrue("SUBSCRIPTION");
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime soon = now.plusDays(REMIND_BEFORE_DAYS);

        int sent = 0;
        for (Payment p : active) {
            if (p.getLastRenewalReminderAt() != null) continue; // already reminded
            Integer months = parsePlanMonths(p.getDescription());
            if (months == null || p.getCreatedAt() == null) continue;
            LocalDateTime expiresAt = p.getCreatedAt().plusMonths(months);
            // Only remind if it's inside the 7-day window and not already expired.
            if (expiresAt.isAfter(now) && !expiresAt.isAfter(soon)) {
                if (p.getUserId() != null) {
                    notificationService.notify(
                            p.getUserId(),
                            "Your Access Pass Expires Soon",
                            "Your HeavenLease Access Pass expires on " + expiresAt.toLocalDate()
                                    + ". Renew now to keep seeing owner contact details.",
                            "RENEWAL");
                    p.setLastRenewalReminderAt(now);
                    paymentRepository.save(p);
                    sent++;
                }
            }
        }
        if (sent > 0) {
            log.info("Sent {} subscription renewal reminder(s)", sent);
        }
    }

    /** Extracts plan:NN from a description like "plan:6 role:tenant" — null when absent. */
    static Integer parsePlanMonths(String description) {
        if (description == null) return null;
        try {
            if (description.startsWith("plan:")) {
                return Integer.valueOf(description.replaceFirst("plan:(\\d+).*", "$1"));
            }
        } catch (NumberFormatException ignored) {
            // not a plan payment
        }
        return null;
    }
}