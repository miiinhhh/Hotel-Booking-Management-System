import { getStoredAccessToken } from './authApi';

export interface CalculatePriceRequest {
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  roomIds: number[];
  voucherCode?: string;
  paymentMethod?: string; // "Deposit" | "Cash"
  numberOfGuests?: number;
}

export interface RoomPriceBreakdown {
  roomId: number;
  roomNumber: string;
  roomTypeId: number;
  roomTypeName: string;
  unitPricePerNight: number;
  numberOfNights: number;
  subTotal: number;
}

export interface PriceCalculationResult {
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  roomBreakdowns: RoomPriceBreakdown[];
  subTotal: number;
  voucherCode?: string;
  voucherId?: number;
  discountAmount: number;
  voucherMessage?: string;
  subTotalAfterDiscount: number;
  feeRate: number;
  feeAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  depositPercentage: number;
  depositAmount: number;
  remainingAmount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5131';

/**
 * Gọi API tính toán và xem trước chi tiết giá đặt phòng
 */
export async function calculateBookingPrice(
  request: CalculatePriceRequest
): Promise<ApiResponse<PriceCalculationResult>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/bookings/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getStoredAccessToken() ? { Authorization: `Bearer ${getStoredAccessToken()}` } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      return {
        success: false,
        message: errorJson?.message || `Lỗi máy chủ (${res.status})`,
        errors: errorJson?.errors,
      };
    }

    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ tính giá.',
      errors: [String(error)],
    };
  }
}

export async function createBooking(input: { checkInDate: string; checkOutDate: string; numberOfGuests: number; paymentMethod: string; voucherCode?: string; specialRequests?: string; rooms: { roomId: number }[]; guests: { fullName: string; phone: string; email: string; isPrimaryGuest: boolean }[] }): Promise<{ bookingId: number; bookingCode: string }> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Vui lòng đăng nhập bằng tài khoản khách hàng trước khi đặt phòng.');
  const response = await fetch(`${API_BASE_URL}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result.data) throw new Error(result?.detail || result?.title || result?.message || 'Không tạo được booking. Vui lòng kiểm tra phòng trống lại.');
  return result.data;
}
