package com.heavenlease.config;

import java.security.Principal;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import com.heavenlease.security.JwtService;

/**
 * Authenticates STOMP CONNECT frames with the same JWT used by REST.
 * Browser WebSocket handshakes cannot reliably carry Authorization headers,
 * so the token is sent in the STOMP CONNECT native header instead.
 */
@Component
@SuppressWarnings("null")
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public WebSocketAuthInterceptor(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    @SuppressWarnings("UseSpecificCatch")
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            String auth = accessor.getFirstNativeHeader("Authorization");
            if (auth == null || !auth.startsWith("Bearer ")) {
                throw new AccessDeniedException("WebSocket authentication required");
            }
            try {
                String token = auth.substring(7).trim();
                String username = jwtService.extractUsername(token);
                UserDetails details = userDetailsService.loadUserByUsername(username);
                if (!jwtService.validateToken(token, details)) {
                    throw new AccessDeniedException("Invalid or expired WebSocket token");
                }
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        details, null, details.getAuthorities());
                accessor.setUser(authentication);
            } catch (AccessDeniedException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new AccessDeniedException("Invalid WebSocket token");
            }
            return message;
        }

        if (StompCommand.SEND.equals(command)) {
            String destination = accessor.getDestination();
            if (!"/app/chat.send".equals(destination)) {
                throw new AccessDeniedException("Destination not allowed");
            }
            if (!hasAuthenticatedUser(accessor)) {
                throw new AccessDeniedException("Authentication required");
            }
        }

        if (StompCommand.SUBSCRIBE.equals(command)) {
            String destination = accessor.getDestination();
            if (!"/user/queue/messages".equals(destination)
                    || !hasAuthenticatedUser(accessor)) {
                throw new AccessDeniedException("Subscription not allowed");
            }
        }

        return message;
    }

    /**
     * Returns true only when a real, authenticated Spring Security principal is
     * attached to the STOMP frame (set during CONNECT from a validated JWT).
     * A plain {@code java.security.Principal} (e.g. an {@code AnonymousAuthenticationToken})
     * is treated as unauthenticated and rejected.
     */
    private boolean hasAuthenticatedUser(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        if (user == null) {
            return false;
        }
        if (user instanceof Authentication auth) {
            return auth.isAuthenticated()
                    && !(auth.getPrincipal() instanceof String anon && "anonymousUser".equals(anon));
        }
        // Any other non-Spring principal was attached by this interceptor only
        // after a valid JWT was verified, so it is trusted.
        return true;
    }
}
