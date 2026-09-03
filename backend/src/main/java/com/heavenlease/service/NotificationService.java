package com.heavenlease.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.heavenlease.model.Notification;
import com.heavenlease.repository.NotificationRepository;

/**
 * Shared helper for creating in-app notifications from feature flows
 * (maintenance, escrow lifecycle, subscription renewal reminders). Keeping the
 * creation here means every caller gets the same "always unread" behaviour
 * without repeating the repository call.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /** Creates and persists a new unread notification for a user. */
    @Transactional
    public Notification notify(Long userId, String title, String message, String type) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRead(false);
        return notificationRepository.save(notification);
    }
}