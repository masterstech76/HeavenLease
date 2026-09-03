package com.heavenlease.controller;

import java.util.Map;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * Real-time messaging via STOMP WebSocket.
 *
 * A client sends a chat message to /app/chat.send and it is broadcast to all
 * subscribers of /topic/messages instantly (no page refresh). The frontend
 * connects to /ws and subscribes to /topic/messages.
 */
@Controller
public class WebSocketMessageController {

    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public Map<String, Object> sendMessage(Map<String, Object> payload) {
        // payload expected: { conversationId, senderId, senderName, content, timestamp }
        return payload;
    }
}