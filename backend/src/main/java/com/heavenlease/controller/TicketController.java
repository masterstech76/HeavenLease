package com.heavenlease.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heavenlease.model.Ticket;
import com.heavenlease.repository.TicketRepository;
import com.heavenlease.security.CurrentUser;

/**
 * Support tickets raised from feature pages (tenant or owner).
 *
 * Routes:
 *   POST /api/tickets               (raise a ticket)
 *   GET  /api/tickets/mine          (my tickets)
 *   PUT  /api/tickets/{id}/status   (ADMIN only: OPEN/IN_PROGRESS/RESOLVED/CLOSED)
 */
@RestController
@RequestMapping("/api/tickets")
@SuppressWarnings("null")
public class TicketController {

    private static final java.util.Set<String> ALLOWED_STATUSES =
            java.util.Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED");

    private final TicketRepository ticketRepository;

    public TicketController(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String pageKey = body.get("pageKey");
        String message = body.get("message");
        if (pageKey == null || pageKey.isBlank() || message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "pageKey and message are required"));
        }
        if (message.length() > 2000) message = message.substring(0, 2000);
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        Ticket t = new Ticket();
        t.setUserId(userId);
        t.setPageKey(pageKey);
        t.setSubject(body.get("subject") != null ? body.get("subject").trim() : "");
        if (t.getSubject().length() > 200) t.setSubject(t.getSubject().substring(0, 200));
        t.setMessage(message);
        t.setStatus("OPEN");
        ticketRepository.save(t);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Ticket raised. Our team will get back to you.",
                "id", t.getId(),
                "status", t.getStatus()
        ));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> mine() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(ticketRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> all() {
        return ResponseEntity.ok(ticketRepository.findAll());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || !ALLOWED_STATUSES.contains(status.toUpperCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status must be OPEN, IN_PROGRESS, RESOLVED or CLOSED"));
        }
        return ticketRepository.findById(id)
                .<ResponseEntity<?>>map(ticket -> {
                    ticket.setStatus(status.toUpperCase());
                    ticketRepository.save(ticket);
                    return ResponseEntity.ok(Map.of("id", ticket.getId(), "status", ticket.getStatus()));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}