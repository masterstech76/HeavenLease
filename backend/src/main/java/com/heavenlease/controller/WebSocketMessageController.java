package com.heavenlease.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import com.heavenlease.model.User;
import com.heavenlease.repository.MessageRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUserDetails;

/**
 * Authenticated STOMP delivery for real-time messages.
 *
 * REST remains the source of truth for persistence. This endpoint only
 * publishes a validated event to the other participant, so a browser cannot
 * forge sender identity or publish to another conversation/topic.
 */
@Controller
@SuppressWarnings("null")
public class WebSocketMessageController {
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketMessageController(MessageRepository messageRepository,
                                      UserRepository userRepository,
                                      SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(Map<String, Object> payload, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUserDetails me)) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required");
        }

        Long conversationId = number(payload.get("conversationId"));
        Long receiverId = number(payload.get("receiverId"));
        String content = payload.get("content") == null ? "" : String.valueOf(payload.get("content")).trim();

        if (conversationId == null || receiverId == null || content.isBlank() || content.length() > 2000) {
            throw new org.springframework.security.access.AccessDeniedException("Invalid message payload");
        }

        var conversation = messageRepository.findByConversationId(conversationId);
        boolean meInConversation = conversation.stream().anyMatch(m ->
                me.getId().equals(m.getSenderId()) || me.getId().equals(m.getReceiverId()));
        boolean receiverInConversation = conversation.stream().anyMatch(m ->
                receiverId.equals(m.getSenderId()) || receiverId.equals(m.getReceiverId()));
        boolean participantPair = conversation.stream().anyMatch(m ->
                (me.getId().equals(m.getSenderId()) && receiverId.equals(m.getReceiverId()))
                || (me.getId().equals(m.getReceiverId()) && receiverId.equals(m.getSenderId())));

        if (!meInConversation || !receiverInConversation || !participantPair) {
            throw new org.springframework.security.access.AccessDeniedException("Conversation access denied");
        }

        User receiver = userRepository.findById(receiverId).orElseThrow(
                () -> new org.springframework.security.access.AccessDeniedException("Recipient not found"));
        User sender = userRepository.findById(me.getId()).orElseThrow(
                () -> new org.springframework.security.access.AccessDeniedException("Sender not found"));

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("conversationId", conversationId);
        event.put("senderId", me.getId());
        event.put("senderName", sender.getFullName());
        event.put("receiverId", receiverId);
        event.put("content", content);
        event.put("timestamp", java.time.Instant.now().toString());

        messagingTemplate.convertAndSendToUser(receiver.getEmail(), "/queue/messages", event);
    }

    private static Long number(Object value) {
        if (value instanceof Number n) return n.longValue();
        if (value == null) return null;
        try { return Long.valueOf(String.valueOf(value)); }
        catch (NumberFormatException ex) { return null; }
    }
}
