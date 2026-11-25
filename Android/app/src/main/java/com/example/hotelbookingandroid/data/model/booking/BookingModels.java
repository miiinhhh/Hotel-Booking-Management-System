package com.example.hotelbookingandroid.data.model.booking;

import java.util.ArrayList;
import java.util.List;

/** DTO cho BookingController (đều được bọc trong ApiResponse). */
public final class BookingModels {
    private BookingModels() {}

    public static final String METHOD_DEPOSIT = "Deposit";
    public static final String METHOD_CASH = "Cash";

    /** POST /api/bookings/calculate-price */
    public static class CalculatePriceRequest {
        public String checkInDate;
        public String checkOutDate;
        public List<Long> roomIds = new ArrayList<>();
        public String voucherCode;
        public String paymentMethod;
        public Integer numberOfGuests;
    }

    public static class RoomPriceBreakdown {
        public long roomId;
        public String roomNumber;
        public String roomTypeName;
        public double unitPricePerNight;
        public int numberOfNights;
        public double subTotal;
    }

    public static class PriceCalculationResult {
        public int numberOfNights;
        public List<RoomPriceBreakdown> roomBreakdowns;
        public double subTotal;
        public String voucherCode;
        public double discountAmount;
        public String voucherMessage;
        public double subTotalAfterDiscount;
        public double feeAmount;
        public double taxAmount;
        public double totalAmount;
        public String paymentMethod;
        public double depositPercentage;
        public double depositAmount;
        public double remainingAmount;
    }

    public static class RoomRef {
        public long roomId;
        public RoomRef(long roomId) { this.roomId = roomId; }
    }

    public static class GuestInput {
        public String fullName;
        public String phone;
        public String email;
        public boolean isPrimaryGuest;

        public GuestInput(String fullName, String phone, String email, boolean isPrimaryGuest) {
            this.fullName = fullName;
            this.phone = phone;
            this.email = email;
            this.isPrimaryGuest = isPrimaryGuest;
        }
    }

    /** POST /api/bookings */
    public static class CreateBookingRequest {
        public String checkInDate;
        public String checkOutDate;
        public int numberOfGuests;
        public String paymentMethod;
        public String voucherCode;
        public String specialRequests;
        public List<RoomRef> rooms = new ArrayList<>();
        public List<GuestInput> guests = new ArrayList<>();
    }

    /** GET /api/bookings (khách hàng chỉ thấy đơn của mình). */
    public static class BookingListItem {
        public long bookingId;
        public String bookingCode;
        public String checkInDate;
        public String checkOutDate;
        public int numberOfGuests;
        public String bookingStatus;
        public String paymentStatus;
        public double totalAmount;
        public double depositAmount;
        public int roomCount;
        public String createdAt;
        public String hotelName;
        public String roomTypeName;
        public String imageUrl;
    }

    public static class BookingDetailLine {
        public long roomId;
        public double unitPrice;
        public int numberOfNights;
        public double subTotal;
    }

    public static class BookingGuest {
        public String fullName;
        public String phone;
        public String email;
        public boolean isPrimaryGuest;
    }

    /** GET /api/bookings/{id} và kết quả POST /api/bookings. */
    public static class BookingDetail {
        public long bookingId;
        public String bookingCode;
        public String checkInDate;
        public String checkOutDate;
        public int numberOfGuests;
        public String bookingStatus;
        public String paymentMethod;
        public String paymentStatus;
        public double subTotal;
        public double taxAmount;
        public double feeAmount;
        public double discountAmount;
        public double totalAmount;
        public double depositAmount;
        public double remainingAmount;
        public String voucherCode;
        public String specialRequests;
        public String holdExpiresAt;
        public String cancellationReason;
        public String createdAt;
        public List<BookingDetailLine> details;
        public List<BookingGuest> guests;

        public boolean canPay() {
            return "Pending".equals(bookingStatus) && "Unpaid".equals(paymentStatus);
        }

        public boolean canCancel() {
            return "Pending".equals(bookingStatus) || "Confirmed".equals(bookingStatus);
        }

        public boolean canReview() {
            return "CheckedOut".equals(bookingStatus) || "Completed".equals(bookingStatus);
        }
    }

    /** GET /api/bookings/{id}/preview-cancel */
    public static class CancellationPreview {
        public double totalAmount;
        public double refundPercentage;
        public double refundAmount;
        public double penaltyAmount;
        public String appliedPolicyName;
        public String policyDescription;
        public boolean isEligibleForRefund;
        public String message;
    }

    public static class CancelRequest {
        public final String reason;
        public CancelRequest(String reason) { this.reason = reason; }
    }
}
