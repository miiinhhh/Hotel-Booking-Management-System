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
  paidAmount?: number;
  remainingAmount?: number;
  totalAmount: number;
  totalAmountText?: string;
  qrType: 'checkin' | 'vietqr';
  qrCaption: string;
  cancellationPolicyNotice?: string;
  isEligibleForReview?: boolean;
}

export interface BookingStats {
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
}
