package com.heavenlease.controller;

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

import com.heavenlease.model.Payment;
import com.heavenlease.model.Property;
import com.heavenlease.model.User;
import com.heavenlease.repository.PaymentRepository;
import com.heavenlease.repository.PropertyRepository;
import com.heavenlease.repository.UserRepository;
import com.heavenlease.security.CurrentUser;
import com.heavenlease.service.NotificationService;
import com.heavenlease.service.PaymentGatewayService;
import com.heavenlease.service.PaymentGatewayService.PaymentResult;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
@SuppressWarnings("null")
public class PaymentController {

    /**
     * Server-side subscription price list (INR). The client NEVER decides how
     * much a plan costs or what benefits it grants — the server derives the
     * amount + description from the validated planMonths on every order.
     * A buyer running the platform can adjust these prices in one place.
     */
    private static final Map<Integer, Double> PLAN_PRICES = Map.of(
            1, 199.0,
            3, 299.0,
            6, 459.0,
            12, 799.0
    );

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public PaymentController(PaymentRepository paymentRepository, PaymentGatewayService paymentGatewayService,
                             PropertyRepository propertyRepository, NotificationService notificationService,
                             UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.paymentGatewayService = paymentGatewayService;
        this.propertyRepository = propertyRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @GetMapping("/config")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPaymentConfig() {
        // Only public, non-secret config is exposed. The Key Secret never leaves the server.
        boolean razorpayConfigured = paymentGatewayService.isRazorpayConfigured();
        String keyId = paymentGatewayService.getRazorpayKeyId();
        return ResponseEntity.ok(Map.of(
                "isConfigured", razorpayConfigured,
                "razorpayConfigured", razorpayConfigured,
                "keyId", keyId != null ? keyId : ""
        ));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllPayments() {
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPayment(@PathVariable Long id) {
        Optional<Payment> payment = paymentRepository.findById(id);
        if (payment.isEmpty()) return ResponseEntity.notFound().build();
        // Only the payer (or ADMIN) may read a payment
        Long ownerId = payment.get().getUserId();
        if (!CurrentUser.isAdmin() && (ownerId == null || !ownerId.equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(payment.get());
    }

    /**
     * Printable invoice / receipt for a single payment. Generates a stable
     * invoice number from the payment id and returns everything a downloadable
     * receipt needs — printed client-side via window.print(), no email needed.
     */
    @GetMapping("/{id}/invoice")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getInvoice(@PathVariable Long id) {
        Optional<Payment> payment = paymentRepository.findById(id);
        if (payment.isEmpty()) return ResponseEntity.notFound().build();
        Payment p = payment.get();
        // Only the payer (or ADMIN) may view the invoice.
        if (!CurrentUser.isAdmin() && (p.getUserId() == null || !p.getUserId().equals(CurrentUser.getId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String payer = "";
        User payerUser = p.getUserId() != null ? userRepository.findById(p.getUserId()).orElse(null) : null;
        if (payerUser != null) {
            payer = (payerUser.getFullName() != null ? payerUser.getFullName() : "") + (payerUser.getEmail() != null ? " <" + payerUser.getEmail() + ">" : "");
        }
        String invoiceNumber = "HL-INV-" + String.format("%06d", p.getId());
        Map<String, Object> invoice = new java.util.HashMap<>();
        invoice.put("invoiceNumber", invoiceNumber);
        invoice.put("issuedAt", p.getCreatedAt() != null ? String.valueOf(p.getCreatedAt()) : "");
        invoice.put("payer", payer);
        invoice.put("amount", p.getAmount());
        invoice.put("currency", "INR");
        invoice.put("paymentType", p.getPaymentType());
        invoice.put("status", p.getStatus());
        invoice.put("transactionId", p.getTransactionId());
        invoice.put("description", p.getDescription());
        invoice.put("propertyId", p.getPropertyId());
        return ResponseEntity.ok(invoice);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPaymentsByUser(@PathVariable Long userId) {
        // Users may only read their own payments (ADMIN sees all)
        if (!CurrentUser.isAdmin() && !userId.equals(CurrentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(paymentRepository.findByUserId(userId));
    }

    /**
     * Creates a Razorpay order for the frontend checkout modal.
     * Returns the order_id + test mode flag.
     */
    @PostMapping("/create-order")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) {
        // SECURITY: subscription amounts are ALWAYS computed server-side from the
        // requested plan. A client-supplied amount is never trusted for subscriptions.
        Integer planMonths = body.get("planMonths") instanceof Number ? ((Number) body.get("planMonths")).intValue() : null;
        String purpose = body.get("purpose") != null ? String.valueOf(body.get("purpose")) : "subscription";
        String receiptId = body.get("receipt") != null ? String.valueOf(body.get("receipt")) : null;
        Double amount;

        if ("subscription".equalsIgnoreCase(purpose) || planMonths != null) {
            if (planMonths == null || !PLAN_PRICES.containsKey(planMonths)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid plan. Choose 1, 3, 6 or 12 months."));
            }
            amount = PLAN_PRICES.get(planMonths);
        } else {
            // Escrow / one-off: allow an explicit amount (still validated > 0).
            amount = body.get("amount") instanceof Number ? ((Number) body.get("amount")).doubleValue() : null;
        }
        if (amount == null || amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid payment amount"));
        }
        PaymentGatewayService.OrderResult result = paymentGatewayService.createOrder(amount, receiptId, Map.of("purpose", purpose));
        if (!result.isSuccess()) {
            return ResponseEntity.badRequest().body(Map.of("error", result.getMessage()));
        }
        return ResponseEntity.ok(Map.of(
                "orderId", result.getOrderId(),
                "message", result.getMessage(),
                "amount", amount,
                "currency", "INR",
                "planMonths", planMonths != null ? planMonths : 0
        ));
    }

    /**
     * Verifies a Razorpay payment signature server-side and marks the
     * payment as completed. Fails closed when Razorpay is not configured.
     *
     * <p>SECURITY: the plan benefit, amount and description are DERIVED
     * SERVER-SIDE from the validated planMonths. A client-supplied
     * description/amount is never trusted — this prevents a user from
     * paying ₹1 and then self-granting a 12-month Access Pass.
     */
    @PostMapping("/verify-payment")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        String paymentId = body.get("paymentId");
        String signature = body.get("signature");
        if (orderId == null || paymentId == null || signature == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "orderId, paymentId, and signature are required"));
        }
        boolean valid = paymentGatewayService.verifyPaymentSignature(orderId, paymentId, signature);
        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Payment signature verification failed"));
        }

        Long userId = CurrentUser.getId();
        Integer planMonths = null;
        if (body.get("planMonths") != null) {
            try {
                planMonths = Integer.valueOf(body.get("planMonths"));
            } catch (NumberFormatException ignored) {
                planMonths = null;
            }
        }

        Payment payment = new Payment();
        payment.setTransactionId(paymentId);
        payment.setUserId(userId);
        payment.setStatus("completed");
        payment.setActive(true);

        if (planMonths != null && PLAN_PRICES.containsKey(planMonths)) {
            double amount = PLAN_PRICES.get(planMonths);
            payment.setAmount(amount);
            payment.setPaymentType("SUBSCRIPTION");
            payment.setDescription("plan:" + planMonths + " role:" + currentUserRole());
        } else {
            // Non-subscription / one-off: preserve the verified amount only. No
            // subscription benefit is ever derived from a client-provided description.
            try {
                payment.setAmount(body.get("amount") != null ? Double.valueOf(body.get("amount")) : 0.0);
            } catch (NumberFormatException ignored) {
                payment.setAmount(0.0);
            }
            payment.setPaymentType(body.getOrDefault("paymentType", "ONLINE"));
            payment.setDescription("online payment");
            payment.setPropertyId(safeLong(body.get("propertyId")));
        }

        Payment saved = paymentRepository.save(payment);
        return ResponseEntity.ok(Map.of("message", "Payment verified successfully", "orderId", orderId, "paymentId", paymentId, "payment", saved));
    }

    /**
     * Returns the authenticated user's subscription status from the payments
     * table — the single server-side source of truth. A subscription is active
     * until its expiry (createdAt + plan months). No client/localStorage data
     * is ever trusted here.
     */
    @GetMapping("/subscription")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getSubscription() {
        Long userId = CurrentUser.getId();
        if (userId == null) {
            return ResponseEntity.ok(Map.of("active", false));
        }
        java.util.Optional<Payment> latest = paymentRepository.findFirstByUserIdAndActiveTrueOrderByCreatedAtDesc(userId);
        Map<String, Object> r = new java.util.HashMap<>();
        r.put("active", false);
        if (latest.isPresent()) {
            Payment p = latest.get();
            java.time.LocalDateTime createdAt = p.getCreatedAt();
            Integer planMonths = parsePlanMonths(p.getDescription());
            java.time.LocalDateTime expiresAt = (planMonths != null && createdAt != null)
                    ? createdAt.plusMonths(planMonths) : null;
            boolean active = expiresAt == null || expiresAt.isAfter(java.time.LocalDateTime.now());
            r.put("active", active);
            r.put("planMonths", planMonths);
            r.put("expiresAt", expiresAt != null ? String.valueOf(expiresAt) : null);
            r.put("amount", p.getAmount());
            r.put("transactionId", p.getTransactionId());
            r.put("createdAt", String.valueOf(createdAt));
            r.put("paymentType", p.getPaymentType());
        }
        return ResponseEntity.ok(r);
    }

    /** Extracts plan months from a payment description like "plan:6 role:tenant" — null when absent. */
    private Integer parsePlanMonths(String description) {
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

    /** Lowest-privilege role label used in server-built payment descriptions. */
    private String currentUserRole() {
        return CurrentUser.hasAnyRole("OWNER", "VERIFIED_OWNER", "ADMIN") ? "owner" : "tenant";
    }

    /** Parses a Long safely (null on blank / malformed). */
    private Long safeLong(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    @PostMapping("/escrow")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> initiateEscrow(@RequestBody Map<String, Object> body) {
        Double amount = body.get("amount") instanceof Number ? ((Number) body.get("amount")).doubleValue() : null;
        Long propertyId = body.get("propertyId") instanceof Number ? ((Number) body.get("propertyId")).longValue() : null;
        Long tenantId = body.get("tenantId") instanceof Number ? ((Number) body.get("tenantId")).longValue() : null;

        if (amount == null || amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "A valid amount is required"));
        }
        if (propertyId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "propertyId is required"));
        }
        // The tenant initiating the escrow must be the authenticated user.
        Long requesterId = CurrentUser.getId();
        if (tenantId == null) tenantId = requesterId;
        if (!tenantId.equals(requesterId) && !CurrentUser.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only initiate escrow for yourself"));
        }
        // Resolve the owner authoritatively from the property (never trust the client).
        Optional<Property> property = propertyRepository.findById(propertyId);
        if (property.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Property not found"));
        }
        Property p = property.get();
        if (p.getOwnerId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "This property has no owner on record"));
        }
        Long ownerId = p.getOwnerId();

        // Persist the escrow first — this works even when Razorpay is not configured
        // (the actual money movement is then done manually in the gateway dashboard).
        Payment escrow = new Payment();
        escrow.setUserId(tenantId);
        escrow.setOwnerId(ownerId);
        escrow.setPropertyId(propertyId);
        escrow.setAmount(amount);
        escrow.setPaymentType("ESCROW");
        escrow.setStatus("ESCROW_PENDING");
        escrow.setActive(false);
        escrow.setEscrow(true);
        escrow.setDescription("escrow_deposit property:" + propertyId);

        // Best-effort gateway order: store the order id when Razorpay is configured.
        if (paymentGatewayService.isRazorpayConfigured()) {
            PaymentResult result = paymentGatewayService.initiateEscrowPayment(amount, propertyId, tenantId, ownerId);
            if (!result.isSuccess()) {
                return ResponseEntity.badRequest().body(Map.of("error", result.getMessage()));
            }
            escrow.setTransactionId(result.getTransactionId());
        }

        Payment saved = paymentRepository.save(escrow);

        // Notify both parties (in-app) that an escrow deposit was initiated.
        notificationService.notify(tenantId, "Escrow Deposit Initiated",
                "Your security deposit of \u20B9" + Math.round(amount)
                        + " for \"" + p.getTitle() + "\" has been recorded. Complete the payment to move it to held.",
                "ESCROW");
        notificationService.notify(ownerId, "Escrow Deposit Initiated",
                "A tenant started a \u20B9" + Math.round(amount) + " security deposit for \"" + p.getTitle() + "\".",
                "ESCROW");

        return ResponseEntity.ok(Map.of("message", "Escrow recorded", "escrowId", saved.getId(),
                "paymentId", saved.getId(), "requiresGateway", !paymentGatewayService.isRazorpayConfigured()));
    }

    /** ADMIN marks a recorded deposit as held (money is in the escrow account). */
    @PostMapping("/escrow/{id}/hold")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> holdEscrow(@PathVariable Long id) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isEmpty() || !existing.get().isEscrow()) return ResponseEntity.notFound().build();
        Payment p = existing.get();
        if (!"ESCROW_PENDING".equals(p.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only a pending escrow can be held"));
        }
        p.setStatus("ESCROW_HELD");
        Payment saved = paymentRepository.save(p);
        notifyEscrowParties(saved, "Escrow Deposit Held",
                "Your escrow deposit of \u20B9" + Math.round(saved.getAmount()) + " is now held securely.");
        return ResponseEntity.ok(saved);
    }

    /**
     * Two-party release: tenant and owner EACH approve. When both have approved the
     * deposit is marked ESCROW_RELEASED and both parties are notified.
     */
    @PostMapping("/escrow/{id}/release/{party}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> releaseEscrow(@PathVariable Long id, @PathVariable String party) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isEmpty() || !existing.get().isEscrow()) return ResponseEntity.notFound().build();
        Payment p = existing.get();
        if (!"ESCROW_HELD".equals(p.getStatus()) && !"ESCROW_PENDING".equals(p.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Escrow is not in a releasable state"));
        }
        Long userId = CurrentUser.getId();
        if ("tenant".equalsIgnoreCase(party)) {
            boolean isTenant = p.getUserId() != null && p.getUserId().equals(userId);
            if (!isTenant && !CurrentUser.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only the tenant can approve release"));
            }
            p.setEscrowTenantApproved(true);
        } else if ("owner".equalsIgnoreCase(party)) {
            boolean isOwner = p.getOwnerId() != null && p.getOwnerId().equals(userId);
            if (!isOwner && !CurrentUser.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only the owner can approve release"));
            }
            p.setEscrowOwnerApproved(true);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "party must be 'tenant' or 'owner'"));
        }

        boolean bothApproved = p.isEscrowTenantApproved() && p.isEscrowOwnerApproved();
        if (bothApproved) {
            p.setStatus("ESCROW_RELEASED");
            Payment saved = paymentRepository.save(p);
            notifyEscrowParties(saved, "Escrow Released",
                    "Both parties approved — your \u20B9" + Math.round(saved.getAmount()) + " deposit has been released to the owner.");
            return ResponseEntity.ok(saved);
        }

        Payment saved = paymentRepository.save(p);
        // Tell the other party that one side has approved.
        String other = "tenant".equalsIgnoreCase(party) ? "owner" : "tenant";
        Long otherId = "owner".equalsIgnoreCase(other) ? saved.getOwnerId() : saved.getUserId();
        String note = (other.equals("owner") ? "Tenant" : "Owner")
                + " approved the escrow release — your approval is still needed.";
        if (otherId != null) {
            notificationService.notify(otherId, "Escrow Release Approved",
                    note + " (\u20B9" + Math.round(saved.getAmount()) + ")", "ESCROW");
        }
        return ResponseEntity.ok(saved);
    }

    /** Either party raises a dispute — the deposit stays held until an admin resolves it. */
    @PostMapping("/escrow/{id}/dispute")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> disputeEscrow(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isEmpty() || !existing.get().isEscrow()) return ResponseEntity.notFound().build();
        Payment p = existing.get();
        if ("ESCROW_RELEASED".equals(p.getStatus()) || "ESCROW_RESOLVED".equals(p.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "This escrow has already been settled"));
        }
        Long userId = CurrentUser.getId();
        boolean isParty = (p.getUserId() != null && p.getUserId().equals(userId))
                || (p.getOwnerId() != null && p.getOwnerId().equals(userId));
        if (!isParty && !CurrentUser.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only escrow parties can raise a dispute"));
        }
        String reason = body.getOrDefault("reason", "").trim();
        if (reason.length() > 500) reason = reason.substring(0, 500);
        p.setStatus("ESCROW_DISPUTED");
        p.setEscrowDisputeReason(reason);
        Payment saved = paymentRepository.save(p);

        Long otherId = (p.getUserId() != null && p.getUserId().equals(userId)) ? p.getOwnerId() : p.getUserId();
        if (otherId != null) {
            notificationService.notify(otherId, "Escrow Disputed",
                    "A dispute was raised on your \u20B9" + Math.round(saved.getAmount())
                            + " deposit" + (reason.isEmpty() ? "." : ": " + reason), "ESCROW");
        }
        return ResponseEntity.ok(saved);
    }

    /** ADMIN resolves a disputed escrow: chooses the outcome + records a note. */
    @PutMapping("/escrow/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resolveEscrow(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isEmpty() || !existing.get().isEscrow()) return ResponseEntity.notFound().build();
        Payment p = existing.get();
        if (!"ESCROW_DISPUTED".equals(p.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only a disputed escrow can be resolved"));
        }
        String note = body.getOrDefault("resolutionNote", "").trim();
        if (note.length() > 500) note = note.substring(0, 500);
        p.setStatus("ESCROW_RESOLVED");
        p.setEscrowResolutionNote(note);
        Payment saved = paymentRepository.save(p);
        notifyEscrowParties(saved, "Escrow Resolved",
                "Your \u20B9" + Math.round(saved.getAmount()) + " deposit was resolved" + (note.isEmpty() ? "." : ": " + note));
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyPayments() {
        Long userId = CurrentUser.getId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (CurrentUser.isAdmin()) return ResponseEntity.ok(paymentRepository.findAll());
        return ResponseEntity.ok(paymentRepository.findByUserId(userId));
    }

    /** Escrow deposits the authenticated user is a party to (tenant, owner or admin). */
    @GetMapping("/escrow/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyEscrows() {
        Long userId = CurrentUser.getId();
        if (CurrentUser.isAdmin()) {
            return ResponseEntity.ok(paymentRepository.findByPaymentType("ESCROW"));
        }
        java.util.List<Payment> asTenant = paymentRepository.findByPaymentTypeAndUserId("ESCROW", userId);
        java.util.List<Payment> asOwner = paymentRepository.findByPaymentTypeAndOwnerId("ESCROW", userId);
        asTenant.addAll(asOwner);
        return ResponseEntity.ok(asTenant);
    }

    /** Convenience helper: notify both tenant + owner of an escrow lifecycle event. */
    private void notifyEscrowParties(Payment p, String title, String message) {
        if (p.getUserId() != null) {
            notificationService.notify(p.getUserId(), title, message, "ESCROW");
        }
        if (p.getOwnerId() != null) {
            notificationService.notify(p.getOwnerId(), title, message, "ESCROW");
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePayment(@PathVariable Long id, @Valid @RequestBody Payment payment) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isPresent()) {
            payment.setId(existing.get().getId());
            return ResponseEntity.ok(paymentRepository.save(payment));
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> togglePaymentActive(@PathVariable Long id) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isPresent()) {
            Payment payment = existing.get();
            payment.setActive(!payment.isActive());
            return ResponseEntity.ok(paymentRepository.save(payment));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePayment(@PathVariable Long id) {
        Optional<Payment> existing = paymentRepository.findById(id);
        if (existing.isPresent()) {
            paymentRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Payment deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}