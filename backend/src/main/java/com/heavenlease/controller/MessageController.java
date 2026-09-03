package com.heavenlease.controller;

import java.util.Comparator;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.Message;
import com.heavenlease.model.User;
import com.heavenlease.repository.MessageRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/messages")
@SuppressWarnings("null")
public class MessageController {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageController(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    /**
     * Lists the current user's conversations, grouped by conversationId.
     * Returns the other party's name, last message, time, and unread count.
     */
    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyConversations() {
        Long me = CurrentUser.getId();
        java.util.List<Message> mine = new java.util.ArrayList<>();
        mine.addAll(messageRepository.findBySenderId(me));
        mine.addAll(messageRepository.findByReceiverId(me));

        java.util.Map<Long, java.util.List<Message>> byConv = new java.util.HashMap<>();
        for (Message m : mine) {
            byConv.computeIfAbsent(m.getConversationId(), k -> new java.util.ArrayList<>()).add(m);
        }

        java.util.List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (var entry : byConv.entrySet()) {
            Long convId = entry.getKey();
            java.util.List<Message> msgs = entry.getValue();
            msgs.sort(Comparator.comparing(m -> m.getTimestamp()));
            Message last = msgs.get(msgs.size() - 1);
            Long otherId = (last.getSenderId() != null && last.getSenderId().equals(me)) ? last.getReceiverId() : last.getSenderId();
            String otherName = "User";
            if (otherId != null) {
                otherName = userRepository.findById(otherId).map(User::getFullName).orElse("User");
            }
            long unread = msgs.stream().filter(m -> Boolean.FALSE.equals(m.isRead())
                    && m.getReceiverId() != null && m.getReceiverId().equals(me)).count();

            Map<String, Object> conv = new java.util.LinkedHashMap<>();
            conv.put("conversationId", convId);
            conv.put("otherUserId", otherId);
            conv.put("otherName", otherName);
            conv.put("lastMessage", last.getContent());
            conv.put("lastTime", String.valueOf(last.getTimestamp()));
            conv.put("unread", unread);
            result.add(conv);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllMessages() {
        return ResponseEntity.ok(messageRepository.findAll());
    }

    @GetMapping("/conversation/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getConversation(@PathVariable Long conversationId) {
        Long currentUserId = CurrentUser.getId();
        java.util.List<Message> messages = messageRepository.findByConversationId(conversationId);
        // IDOR guard: only messages where the current user is sender or receiver
        if (currentUserId != null) {
            messages = messages.stream()
                    .filter(m -> (m.getSenderId() != null && m.getSenderId().equals(currentUserId))
                            || (m.getReceiverId() != null && m.getReceiverId().equals(currentUserId)))
                    .toList();
        } else {
            messages = java.util.List.of();
        }
        messages.sort(Comparator.comparing(m -> m.getTimestamp()));
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> sendMessage(@Valid @RequestBody Message message) {
        // SECURITY: sender must be the authenticated user
        message.setSenderId(CurrentUser.getId());
        message.setRead(false);
        Message saved = messageRepository.save(message);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> markMessageRead(@PathVariable Long id) {
        Optional<Message> existing = messageRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Message message = existing.get();
        // Only the receiver may mark a message as read
        Long currentUserId = CurrentUser.getId();
        if (currentUserId == null || message.getReceiverId() == null
                || !message.getReceiverId().equals(currentUserId)) {
            return ResponseEntity.notFound().build();
        }
        message.setRead(true);
        return ResponseEntity.ok(messageRepository.save(message));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        Optional<Message> existing = messageRepository.findById(id);
        if (existing.isPresent()) {
            messageRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Message deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}