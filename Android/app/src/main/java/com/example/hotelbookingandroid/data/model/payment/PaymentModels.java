package com.example.hotelbookingandroid.data.model.payment;

/** DTO cho PaymentsController (VNPay). */
public final class PaymentModels {
    private PaymentModels() {}

    public static final String TARGET_DEPOSIT = "Deposit";
    public static final String TARGET_FULL = "Full";

    /** POST /api/payments/vnpay/create-payment */
    public static class VnPayCreateRequest {
        public final long bookingId;
        public final String paymentTarget;

        public VnPayCreateRequest(long bookingId, String paymentTarget) {
            this.bookingId = bookingId;
            this.paymentTarget = paymentTarget;
        }
    }

    public static class VnPayPaymentResponse {
        public long paymentId;
        public long bookingId;
        public String bookingCode;
        public String txnRef;
        public double amount;
        public String paymentUrl;
    }

    /** GET /api/payments/vnpay/return?json=1 (Backend xác minh chữ ký VNPay). */
    public static class VnPayCallbackResult {
        public boolean success;
        public String message;
        public long bookingId;
        public String bookingCode;
        public String txnRef;
        public String transactionNo;
        public double amount;
        public String status;
    }
}
