package com.heavenlease.service;

import java.util.Map;
import java.util.UUID;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;

/**
 * Payment gateway. When the ADMIN configures Razorpay credentials via the
 * Integration Settings page, real orders are created through the Razorpay API
 * and payment signatures are verified server-side.
 */
@Service
public class PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(PaymentGatewayService.class);

    private final IntegrationService integrationService;

    public PaymentGatewayService(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    public static class PaymentResult {
        private final boolean success;
        private final String transactionId;
        private final String message;

        public PaymentResult(boolean success, String transactionId, String message) {
            this.success = success;
            this.transactionId = transactionId;
            this.message = message;
        }

        public boolean isSuccess() { return success; }
        public String getTransactionId() { return transactionId; }
        public String getMessage() { return message; }
    }

    public static class OrderResult {
        private final boolean success;
        private final String orderId;
        private final String message;

        public OrderResult(boolean success, String orderId, String message) {
            this.success = success;
            this.orderId = orderId;
            this.message = message;
        }

        public boolean isSuccess() { return success; }
        public String getOrderId() { return orderId; }
        public String getMessage() { return message; }
    }

    // Razorpay keys come from the encrypted Admin → Integrations settings first,
    // falling back to the matching environment variables. The buyer replaces them
    // in one place (Admin panel or .env) — no code changes needed.
    @Value("${RAZORPAY_KEY_ID:}")
    private String envRazorpayKeyId;

    @Value("${RAZORPAY_KEY_SECRET:}")
    private String envRazorpayKeySecret;

    private String rzpKeyId() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.RAZORPAY_KEY_ID) : null;
        return (db != null && !db.isBlank()) ? db : envRazorpayKeyId;
    }

    private String rzpKeySecret() {
        String db = integrationService != null ? integrationService.getSecret(IntegrationService.RAZORPAY_KEY_SECRET) : null;
        return (db != null && !db.isBlank()) ? db : envRazorpayKeySecret;
    }

    public boolean isRazorpayConfigured() {
        String id = rzpKeyId();
        String sec = rzpKeySecret();
        return id != null && !id.isBlank() && sec != null && !sec.isBlank();
    }

    public String getRazorpayKeyId() {
        return rzpKeyId();
    }

    public OrderResult createOrder(Double amount, String receiptId, Map<String, String> notes) {
        if (amount == null || amount <= 0) {
            return new OrderResult(false, null, "Invalid payment amount");
        }

        boolean razorpayConfigured = isRazorpayConfigured();

        // NEVER fake a success. If no gateway is configured we return a clean
        // "not configured" so the buyer must add their keys to accept payments.
        if (!razorpayConfigured) {
            String msg = "Payment gateway not configured. Please configure Razorpay in Admin \u2192 Integrations.";
            log.warn(msg);
            return new OrderResult(false, null, msg);
        }

        try {
            RazorpayClient client = new RazorpayClient(rzpKeyId(), rzpKeySecret());

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", Math.round(amount * 100));
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", receiptId != null ? receiptId : UUID.randomUUID().toString().substring(0, 20));
            if (notes != null && !notes.isEmpty()) {
                JSONObject notesJson = new JSONObject();
                notes.forEach(notesJson::put);
                orderRequest.put("notes", notesJson);
            }

            Order order = client.orders.create(orderRequest);
            String orderId = order.get("id");
            log.info("Razorpay order created: {}", orderId);
            return new OrderResult(true, orderId, "Order created");
        } catch (RazorpayException | org.json.JSONException e) {
            log.error("Failed to create Razorpay order: {}", e.getMessage());
            return new OrderResult(false, null, "Payment gateway error: " + e.getMessage());
        }
    }

    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        if (orderId == null || paymentId == null || signature == null) return false;

        boolean razorpayConfigured = isRazorpayConfigured();

        // Fail closed: a missing gateway must never auto-approve a signature.
        if (!razorpayConfigured) {
            log.warn("Signature verification attempted with no Razorpay configured — rejecting.");
            return false;
        }

        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, rzpKeySecret());
        } catch (RazorpayException | org.json.JSONException e) {
            log.error("Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    // Refund feature intentionally removed per client request — refunds are handled
    // only through manual back-office processing / gateway dashboard.

    public PaymentResult initiateEscrowPayment(Double amount, Long propertyId, Long tenantId, Long ownerId) {
        if (amount == null || amount <= 0) {
            return new PaymentResult(false, null, "Invalid escrow amount");
        }
        // Real escrow: create a Razorpay order for the security deposit. The tenant
        // completes checkout in Razorpay and the success is verified server-side via
        // verifyPaymentSignature (same flow as subscriptions). The payment record is
        // then held as escrow by the platform until both parties release it.
        OrderResult escrowOrder = createOrder(amount, "escrow_" + System.currentTimeMillis(), Map.of(
                "purpose", "escrow_deposit",
                "propertyId", propertyId != null ? String.valueOf(propertyId) : "",
                "tenantId", tenantId != null ? String.valueOf(tenantId) : "",
                "ownerId", ownerId != null ? String.valueOf(ownerId) : ""
        ));
        if (!escrowOrder.isSuccess()) {
            return new PaymentResult(false, null, escrowOrder.getMessage());
        }
        return new PaymentResult(true, escrowOrder.getOrderId(), "Escrow payment order created");
    }
}