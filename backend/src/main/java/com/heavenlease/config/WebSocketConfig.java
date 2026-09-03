package com.heavenlease.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Enables STOMP WebSocket support for real-time messaging.
 * Clients connect to /ws and subscribe to /topic/messages to receive
 * new messages instantly (no page refresh needed).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.cors.allowed-origins:https://heavenlease.in,https://www.heavenlease.in}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Messages broadcast to clients go to /topic/*
        config.enableSimpleBroker("/topic");
        // Client-to-server messages (e.g. sending a chat message) go to /app/*
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    @SuppressWarnings("null") // allowedOrigins.split is @NonNull; JDT null-analysis can't prove it
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // WebSocket endpoint for browsers. Plain WS (no SockJS) so the
        // lightweight frontend client using `new WebSocket()` works directly.
        // SECURITY: only the configured CORS origins may open a socket.
        String[] origins = java.util.Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins);
    }
}
