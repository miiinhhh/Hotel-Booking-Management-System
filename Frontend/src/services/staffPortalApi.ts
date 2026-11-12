import { apiClient, ApiResponse } from './apiClient';
import { RoomCategorySchedule, StaffCustomer, StaffMetricsData } from '../pages/staff/types';

export interface StaffPortalBookingDto {
  bookingId: number;
  bookingCode: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  roomNumbers: string[];
  roomTypes: string[];
  areas: string[];
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  depositAmount: number;
  specialRequests?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffPortalDashboard {
  bookings: StaffPortalBookingDto[];
  metrics: StaffMetricsData;
}

const requireData = <T>(response: ApiResponse<T>, fallbackMessage: string): T => {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
};

export async function getStaffDashboard(): Promise<StaffPortalDashboard> {
  return requireData(
    await apiClient<StaffPortalDashboard>('/api/staff/portal/bookings'),
    'Không tải được dữ liệu đặt phòng của nhân viên.',
  );
}

/**
 * Lấy danh sách khách hàng CRM thực tế từ backend
 */
export async function getStaffCustomers(): Promise<StaffCustomer[]> {
  return requireData(
    await apiClient<StaffCustomer[]>('/api/staff/portal/customers'),
    'Không tải được hồ sơ khách hàng.',
  );
}

/**
 * Lấy ma trận lịch buồng phòng (Calendar) thực tế từ backend
 */
export async function getStaffCalendar(days: number = 7, hotelId?: number): Promise<RoomCategorySchedule[]> {
  const url = `/api/staff/portal/calendar?days=${days}${hotelId ? `&hotelId=${hotelId}` : ''}`;
  return requireData(
    await apiClient<RoomCategorySchedule[]>(url),
    'Không tải được lịch phòng.',
  );
}

/**
 * Đổi lịch lưu trú (Reschedule)
 */
export async function rescheduleBooking(
  bookingId: number,
  request: { newCheckInDate: string; newCheckOutDate: string; newRoomIds?: number[]; reason?: string }
): Promise<ApiResponse<any>> {
  return apiClient<any>(`/api/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

/**
 * Đánh dấu khách vắng mặt (No-Show)
 */
export async function markNoShow(
  bookingId: number,
  note?: string
): Promise<ApiResponse<boolean>> {
  return apiClient<boolean>(`/api/bookings/${bookingId}/no-show`, {
    method: 'POST',
    body: JSON.stringify({ note })
  });
}

