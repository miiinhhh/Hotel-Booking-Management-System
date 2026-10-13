export type StaffBookingStatus =
  | 'confirmed_deposit'
  | 'pending_deposit'
  | 'checked_in'
  | 'staying'
  | 'cancelled';

export type StaffDepositStatus =
  | 'deposited_50'
  | 'paid_100'
  | 'unpaid'
  | 'refunded';

export interface StaffBooking {
  id: string;
  bookingCode: string;
  createdAt: string;
  customerName: string;
  customerInitials: string;
  customerPhone: string;
  customerEmail: string;
  customerCccd: string;
  vipLevel: string;
  membershipTier: string;
  zone: string; // e.g. "Tòa A", "Tòa B"
  roomNumber: string; // e.g. "P.402", "Villa 105"
  roomType: string;
  roomDetails: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  nightsCount: number;
  nightsLabel: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  depositStatus: StaffDepositStatus;
  depositStatusLabel: string;
  depositDeadline?: string;
  status: StaffBookingStatus;
  statusLabel: string;
  transactionCode?: string;
  specialRequests?: string;
  receptionist: string;
  internalNotes?: string;
  approvalStatus?: 'accepted' | 'rejected' | 'pending';
  lastUpdated?: string;
}

export interface StaffMetricsData {
  totalToday: number;
  totalChangePercent: number;
  pendingDepositCount: number;
  checkInTodayCount: number;
  checkInCompletedCount: number;
  checkInRemainingCount: number;
  checkOutTodayCount: number;
  checkOutCompletedCount: number;
  checkOutPendingKeyCount: number;
}
