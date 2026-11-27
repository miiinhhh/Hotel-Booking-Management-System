export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';
export type BookingTab = 'upcoming' | 'completed' | 'cancelled';

export interface BookingGuestInfo {
  name: string;
  countText: string;
}

export interface BookingItem {
  id: string;
  bookingCode: string;
  hotelName: string;
  hotelCategory: string;
  location: string;
  roomType: string;
  /** Số phòng do lễ tân xếp — chỉ có sau khi nhận phòng. */
  roomNumbers?: string;
  image: string;
  imageAlt?: string;
  nightsText: string;
  checkInDate: string;
  checkInDetail: string;
  checkOutDate: string;
  checkOutDetail: string;
  guest: BookingGuestInfo;
  amenities: {
    icon: string;
    text: string;
  }[];
  status: BookingStatus;
  statusLabel: string;
  statusCountdown?: string;
  depositBadge?: string;
  paymentStatus?: string;
  paidAmount?: number;
  remainingAmount?: number;
  totalAmount: number;
  /** Trạng thái gốc từ máy chủ (Pending, CheckedIn...) để hiện badge chính xác. */
  statusRaw?: string;
  /** Tiền cọc cần trả để giữ phòng (đơn chưa thanh toán). */
  depositDue?: number;
  roomCount?: number;
  numberOfGuests?: number;
  totalAmountText?: string;
  refundAmount?: number;
  refundedAt?: string;
  qrType: 'checkin' | 'vietqr';
  qrCaption: string;
  cancellationPolicyNotice?: string;
  isEligibleForReview?: boolean;
  /** Đã có đánh giá lưu trong CSDL (nút chuyển thành "Sửa đánh giá"). */
  hasReview?: boolean;
  /** Khách đã xóa đánh giá của đơn này (không viết lại được). */
  reviewDeleted?: boolean;
}

export interface BookingStats {
  /** Chuyến đi đã chốt (đã xác nhận/đang lưu trú) — không tính đơn chưa thanh toán. */
  upcomingCount: number;
  /** Đơn đang chờ thanh toán (vẫn nằm trong tab Sắp tới để khách thanh toán). */
  pendingPaymentCount: number;
  completedCount: number;
  cancelledCount: number;
}
