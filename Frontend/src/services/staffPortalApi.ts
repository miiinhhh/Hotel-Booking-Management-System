import { apiClient, ApiResponse } from './apiClient';
import { RoomCategorySchedule, StaffCustomer } from '../pages/staff/types';
import { MOCK_STAFF_CUSTOMERS } from '../pages/staff/data/mockStaffCustomers';
import { MOCK_ROOM_SCHEDULES } from '../pages/staff/data/mockStaffCalendar';

/**
 * Lấy danh sách khách hàng CRM thực tế từ backend
 */
export async function getStaffCustomers(): Promise<StaffCustomer[]> {
  try {
    const res = await apiClient<StaffCustomer[]>('/api/staff/portal/customers');
    if (res.success && res.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Lỗi gọi API /api/staff/portal/customers, sử dụng dữ liệu mẫu:', err);
  }
  return MOCK_STAFF_CUSTOMERS;
}

/**
 * Lấy ma trận lịch buồng phòng (Calendar) thực tế từ backend
 */
export async function getStaffCalendar(days: number = 7, hotelId?: number): Promise<RoomCategorySchedule[]> {
  try {
    const url = `/api/staff/portal/calendar?days=${days}${hotelId ? `&hotelId=${hotelId}` : ''}`;
    const res = await apiClient<RoomCategorySchedule[]>(url);
    if (res.success && res.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Lỗi gọi API /api/staff/portal/calendar, sử dụng dữ liệu mẫu:', err);
  }
  return MOCK_ROOM_SCHEDULES;
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

