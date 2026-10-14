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

// ==========================================
// 1. HỒ SƠ KHÁCH HÀNG (CUSTOMER CRM) TYPES
// ==========================================
export type CustomerTier = 'GOLD' | 'PLATINUM' | 'SILVER' | 'STANDARD';

export interface CustomerRecentBooking {
  bookingCode: string;
  roomName: string;
  roomNumber?: string;
  building?: string;
  dates: string;
  nightsText?: string;
  amount: string;
  status: string;
  isActive?: boolean;
}

export interface CustomerPreference {
  icon: string;
  text: string;
  colorClass?: string;
  isWarning?: boolean;
}

export interface StaffCustomer {
  id: string;
  customerCode: string;
  name: string;
  initials: string;
  tier: CustomerTier;
  country: string;
  phone: string;
  email: string;
  identityCard: string;
  birthDate: string;
  company?: string;
  isStaying: boolean;
  currentRoom?: string;
  lastStayInfo: string;
  totalSpend: number;
  totalSpendFormatted: string;
  totalCompletedBookings: number;
  serviceNotesTags: string[];
  preferences: CustomerPreference[];
  recentBookings: CustomerRecentBooking[];
  memberSinceYear: string;
  nfcChipOk?: boolean;
}

export interface CustomerCRMStats {
  returnRatePercent: number;
  returnRateTrend: string;
  adrAmount: string;
  adrSegment: string;
  verifiedCccdPercent: number;
  verifiedCccdNote: string;
  totalStoredCount: number;
}

// ==========================================
// 2. LỊCH PHÒNG & KHÓA BÁN (CALENDAR) TYPES
// ==========================================
export type RoomDayStatus = 'available' | 'low' | 'full' | 'locked';

export interface RoomAvailabilityDay {
  date: string;
  dayOfWeek: string;
  dateFormatted: string;
  dayTag: string; // e.g. "Hôm nay", "Cuối tuần", "Chủ nhật", "Đầu tuần", "Trong tuần"
  isToday?: boolean;
  occupancyPercent: number;
  availableCount: number;
  totalCount: number;
  status: RoomDayStatus;
  statusNote?: string;
  isEmergencyLocked?: boolean;
  lockedRoomNumber?: string;
  lockedReason?: string;
}

export interface RoomCategorySchedule {
  id: string;
  building: string; // e.g. "Tòa A", "Tòa B"
  categoryGroup: string; // e.g. "Phân khu Tòa B · Deluxe Category", "Phân khu Tòa A · Villa & Suite Category"
  name: string;
  totalRooms: number;
  roomSpecs: string; // e.g. "Tầng 5 - 8 • Trực diện biển", "95m² • Ban công hoàng hôn"
  days: RoomAvailabilityDay[];
}

export interface EmergencyLockFormData {
  buildingAndCategory: string;
  roomNumbers: string[];
  startDate: string;
  endDate: string;
  reason: 'maintenance' | 'emergency' | 'vip_hold' | 'other';
  internalNotes: string;
}

// ==========================================
// 3. SUITES & PHÂN KHU (CAMPUS ZONES) TYPES
// ==========================================
export interface StaffZone {
  id: string;
  code: string; // "Tòa A", "Tòa B", "Tòa C", "Khu Biệt Thự Biển"
  name: string;
  subTitle: string;
  image: string;
  floors: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  cleaningRooms?: number;
  maintenanceRooms?: number;
  occupancyPercent: number;
  isAssigned: boolean;
  supervisor: string;
  supervisorInitials: string;
  accessLevel: 'full' | 'view_only';
}

export type StaffPortalTab = 'reservations' | 'calendar' | 'suites' | 'customers';

