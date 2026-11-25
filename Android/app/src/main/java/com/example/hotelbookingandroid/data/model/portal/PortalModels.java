package com.example.hotelbookingandroid.data.model.portal;

import java.io.Serializable;
import java.util.List;

/** DTO cho Admin/Staff Portal (StaffPortalController, VouchersController, StaffController, Reports...). */
public final class PortalModels {
    private PortalModels() {}

    // ===== Đặt phòng (GET /api/staff/portal/bookings) =====
    public static class PortalBooking implements Serializable {
        public long bookingId;
        public String bookingCode;
        public long customerId;
        public String customerName;
        public String customerPhone;
        public String customerEmail;
        public List<String> roomNumbers;
        public List<String> roomTypes;
        public List<String> areas;
        public String checkInDate;
        public String checkOutDate;
        public int numberOfGuests;
        public String bookingStatus;
        public String paymentStatus;
        public double totalAmount;
        public double paidAmount;
        public double remainingAmount;
        public double depositAmount;
        public String specialRequests;
        public String createdAt;
    }

    public static class StaffMetrics {
        public int totalToday;
        public double totalChangePercent;
        public int pendingDepositCount;
        public int checkInTodayCount;
        public int checkInCompletedCount;
        public int checkInRemainingCount;
        public int checkOutTodayCount;
        public int checkOutCompletedCount;
        public int checkOutPendingKeyCount;
    }

    public static class StaffDashboard {
        public List<PortalBooking> bookings;
        public StaffMetrics metrics;
    }

    public static class UpdateStatusRequest {
        public final String newStatus;
        public final String note;
        public UpdateStatusRequest(String newStatus, String note) { this.newStatus = newStatus; this.note = note; }
    }

    public static class NoteRequest {
        public final String note;
        public NoteRequest(String note) { this.note = note; }
    }

    // ===== Khách hàng (GET /api/staff/portal/customers) =====
    public static class Customer {
        public String id;
        public String customerCode;
        public String name;
        public String initials;
        /** GOLD | PLATINUM | SILVER | STANDARD */
        public String tier;
        public String phone;
        public String email;
        public boolean isStaying;
        public String currentRoom;
        public String lastStayInfo;
        public double totalSpend;
        public String totalSpendFormatted;
        public int totalCompletedBookings;
    }

    // ===== Thông báo =====
    public static class Notification {
        public String id;
        public String type;
        /** Chỉ có ở Admin: "action" | "info" */
        public String severity;
        public String title;
        public String description;
        public String occurredAt;
        public boolean isRead;
    }

    public static class MarkReadRequest {
        public final List<String> keys;
        public MarkReadRequest(List<String> keys) { this.keys = keys; }
    }

    // ===== Báo cáo (GET /api/admin/reports/overview) =====
    public static class ReportDay {
        public String date;
        public double revenue;
        public int bookings;
    }

    public static class BusinessReport {
        public String from;
        public String to;
        public double revenue;
        public int bookingCount;
        public int cancelledBookings;
        /** Đã là phần trăm (vd 12.5). */
        public double cancellationRate;
        public double occupancyRate;
        public int occupiedRoomNights;
        public int availableRoomNights;
        public List<ReportDay> days;
    }

    // ===== Voucher quản trị =====
    public static class AdminVoucher {
        public long voucherId;
        public String code;
        public String voucherType;
        public double discountValue;
        public double minimumOrderAmount;
        public Double maxDiscountAmount;
        public String startAt;
        public String endAt;
        public Integer usageLimit;
        public int usedCount;
        public boolean isActive;
    }

    public static class Paged<T> {
        public List<T> items;
        public int totalCount;
        public int page;
        public int pageSize;
        public int totalPages;
    }

    public static class ToggleResult {
        public long voucherId;
        public boolean isActive;
    }

    // ===== Nhân viên (GET /api/staff) =====
    public static class StaffAccount {
        public long userId;
        public String fullName;
        public String email;
        public String phone;
        public boolean isActive;
        public List<String> roles;
    }

    public static class StaffPage {
        public List<StaffAccount> items;
        public int page;
        public int pageSize;
        public int total;
    }

    public static class ActiveRequest {
        public final boolean isActive;
        public ActiveRequest(boolean isActive) { this.isActive = isActive; }
    }

    // ===== Lịch phòng & khóa bán =====
    /** Một ô ngày của một hạng phòng (GET /api/staff/portal/calendar). */
    public static class CalendarDay {
        public String date;
        public String dayOfWeek;
        public String dateFormatted;
        public String dayTag;
        public boolean isToday;
        public int occupancyPercent;
        public int availableCount;
        public int totalCount;
        public int lockedCount;
        /** available | low | full | locked */
        public String status;
        public String statusNote;
        public boolean isEmergencyLocked;
        public String lockedRoomNumber;
        public String lockedReason;
    }

    public static class RoomSchedule {
        public String id;
        public int hotelId;
        public int areaId;
        public int roomTypeId;
        public List<Long> roomIds;
        public String building;
        public String categoryGroup;
        public String name;
        public int totalRooms;
        public String roomSpecs;
        public List<CalendarDay> days;
    }

    /** GET /api/hotels/{hotelId}/rooms */
    public static class Room {
        public long roomId;
        public int hotelId;
        public int areaId;
        public int roomTypeId;
        public String roomNumber;
        public int floor;
        /** Available | Occupied | Maintenance | Inactive */
        public String status;
        public String description;
        public boolean isActive;
        public double price;
        public int capacity;
    }

    /** POST /areas/{areaId}/rooms, PUT /rooms/{id} */
    public static class RoomInput {
        public final int roomTypeId;
        public final String roomNumber;
        public final int floor;
        public final String status;
        public final String description;

        public RoomInput(int roomTypeId, String roomNumber, int floor, String status, String description) {
            this.roomTypeId = roomTypeId;
            this.roomNumber = roomNumber;
            this.floor = floor;
            this.status = status;
            this.description = description;
        }
    }

    // ===== Phân khu & hạng phòng =====
    public static final String AREA_ZONE = "Zone";
    public static final String AREA_BUILDING = "Building";

    /** GET /api/hotels/{hotelId}/areas?includeInactive=true */
    public static class HotelArea implements Serializable {
        public int areaId;
        public int hotelId;
        public String areaName;
        /** Zone | Building — Building phải thuộc một Zone. */
        public String areaType;
        public Integer parentAreaId;
        public String parentAreaName;
        public String description;
        public String locationDescription;
        public Integer floorCount;
        public boolean isActive;
        public int childAreaCount;
        public int roomTypeCount;
        public int roomCount;
        public int assignedStaffCount;

        public boolean isZone() { return AREA_ZONE.equals(areaType); }
    }

    public static class AreaInput {
        public final String areaName;
        public final String areaType;
        public final Integer parentAreaId;
        public final String description;
        public final String locationDescription;
        public final Integer floorCount;
        public final boolean isActive;

        public AreaInput(String areaName, String areaType, Integer parentAreaId, String description,
                         String locationDescription, Integer floorCount, boolean isActive) {
            this.areaName = areaName;
            this.areaType = areaType;
            this.parentAreaId = parentAreaId;
            this.description = description;
            this.locationDescription = locationDescription;
            this.floorCount = floorCount;
            this.isActive = isActive;
        }

        /** Giữ nguyên thông tin, chỉ đổi trạng thái (kích hoạt lại phân khu). */
        public static AreaInput of(HotelArea a, boolean isActive) {
            return new AreaInput(a.areaName, a.areaType, a.parentAreaId, a.description,
                    a.locationDescription, a.floorCount, isActive);
        }
    }

    /** GET /api/hotels/{hotelId}/room-types */
    public static class RoomType {
        public int roomTypeId;
        public int hotelId;
        public int areaId;
        public String name;
        public String description;
        public double basePrice;
        public int capacity;
        public int numberOfBeds;
        public boolean isActive;
    }

    public static class RoomTypeInput {
        public final String name;
        public final String description;
        public final double basePrice;
        public final int capacity;
        public final int numberOfBeds;

        public RoomTypeInput(String name, String description, double basePrice, int capacity, int numberOfBeds) {
            this.name = name;
            this.description = description;
            this.basePrice = basePrice;
            this.capacity = capacity;
            this.numberOfBeds = numberOfBeds;
        }
    }

    /** Lệnh khóa bán khẩn cấp. */
    public static class RoomLock {
        public long lockId;
        public String batchId;
        public int hotelId;
        public long roomId;
        public String startsAt;
        public String endsAt;
        public String reason;
        public String createdAt;
        /** Scheduled | Active | Expired | Released */
        public String status;

        public boolean isReleasable() { return "Scheduled".equals(status) || "Active".equals(status); }
    }

    public static class LockRequest {
        public final List<Long> roomIds;
        public final String startsAt;
        public final String endsAt;
        public final String reason;

        public LockRequest(List<Long> roomIds, String startsAt, String endsAt, String reason) {
            this.roomIds = roomIds;
            this.startsAt = startsAt;
            this.endsAt = endsAt;
            this.reason = reason;
        }
    }

    // ===== Giá phòng (RoomPriceHistory) =====
    public static class PriceHistory {
        public long priceHistoryId;
        public int roomTypeId;
        public double price;
        public String effectiveFrom;
        /** null = áp dụng không thời hạn */
        public String effectiveTo;
        public long changedByUserId;
        public String createdAt;
    }

    public static class PriceHistoryRequest {
        public final double price;
        public final String effectiveFrom;
        public final String effectiveTo;

        public PriceHistoryRequest(double price, String effectiveFrom, String effectiveTo) {
            this.price = price;
            this.effectiveFrom = effectiveFrom;
            this.effectiveTo = effectiveTo;
        }
    }

    // ===== Khách sạn & đánh giá =====
    public static class HotelSummary {
        public int hotelId;
        public String hotelName;
        public String city;
    }

    public static class HotelPage {
        public List<HotelSummary> items;
        public int totalCount;
    }

    public static class AdminReview {
        public long reviewId;
        public long bookingId;
        public long customerId;
        public int rating;
        public String comment;
        /** Visible | Hidden | Deleted */
        public String status;
        public String createdAt;
    }

    public static class ReviewPage {
        public List<AdminReview> items;
        public int total;
    }

    public static class ModerateRequest {
        public final String status;
        public final String reason;
        public ModerateRequest(String status, String reason) { this.status = status; this.reason = reason; }
    }
}
