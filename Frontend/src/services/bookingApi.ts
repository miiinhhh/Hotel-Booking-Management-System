import { apiClient, ApiResponse } from './apiClient';
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

export interface BookingListDto {
  bookingId: number;
  bookingCode: string;
  customerId: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  bookingStatus: string; // "Pending", "Confirmed", "CheckedIn", "CheckedOut", "Cancelled", "Completed"
  paymentStatus: string; // "Unpaid", "PartiallyPaid", "Paid", "Refunded"
  totalAmount: number;
  depositAmount: number;
  roomCount: number;
  createdAt: string;
}

export interface BookingFilterRequest {
  bookingCode?: string;
  customerId?: number;
  status?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface UpdateBookingStatusRequest {
  newStatus: string;
  note?: string;
  specialRequests?: string;
}

export interface CancellationPreviewDto {
  bookingId: number;
  totalAmount: number;
  paidAmount: number;
  refundPercentage: number;
  penaltyPercentage: number;
  refundAmount: number;
  penaltyAmount: number;
  policyDescription: string;
  isEligibleForRefund: boolean;
  daysUntilCheckIn: number;
}

export interface CancelBookingRequest {
  reason: string;
}

export interface ConfirmPaymentRequest {
  isSuccessful: boolean;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Tính toán chi tiết giá đặt phòng
 */
export async function calculateBookingPrice(
  request: CalculatePriceRequest
): Promise<ApiResponse<PriceCalculationResult>> {
  return apiClient<PriceCalculationResult>('/api/bookings/calculate-price', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Lấy danh sách booking (Staff Portal / Admin)
 */
export async function getBookingsList(
  filter: BookingFilterRequest = {}
): Promise<ApiResponse<BookingListDto[]>> {
  const params = new URLSearchParams();
  if (filter.bookingCode) params.append('bookingCode', filter.bookingCode);
  if (filter.customerId) params.append('customerId', String(filter.customerId));
  if (filter.status && filter.status !== 'all') params.append('status', filter.status);
  if (filter.paymentStatus && filter.paymentStatus !== 'all') params.append('paymentStatus', filter.paymentStatus);
  if (filter.fromDate) params.append('fromDate', filter.fromDate);
  if (filter.toDate) params.append('toDate', filter.toDate);
  if (filter.pageIndex) params.append('pageIndex', String(filter.pageIndex));
  if (filter.pageSize) params.append('pageSize', String(filter.pageSize));

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient<BookingListDto[]>(`/api/bookings${query}`);
}

/**
 * Cập nhật trạng thái booking (Check-in, Check-out, Completed)
 */
export async function updateBookingStatus(
  bookingId: number,
  request: UpdateBookingStatusRequest
): Promise<ApiResponse<boolean>> {
  return apiClient<boolean>(`/api/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  });
}

/**
 * Xem trước số tiền hoàn / phạt khi hủy booking theo chính sách
 */
export async function previewCancelBooking(
  bookingId: number
): Promise<ApiResponse<CancellationPreviewDto>> {
  return apiClient<CancellationPreviewDto>(`/api/bookings/${bookingId}/preview-cancel`);
}

/**
 * Hủy booking
 */
export async function cancelBooking(
  bookingId: number,
  reason: string
): Promise<ApiResponse<boolean>> {
  return apiClient<boolean>(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Xác nhận thanh toán / đặt cọc (Payments API)
 */
export async function confirmBookingPayment(
  paymentId: number,
  isSuccessful = true
): Promise<ApiResponse<any>> {
  return apiClient<any>(`/api/payments/${paymentId}/confirm`, {
    method: 'PUT',
    body: JSON.stringify({ isSuccessful }),
  });
}

/**
 * Tạo đơn đặt phòng mới (Khách hàng)
 */
export async function createBooking(input: {
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  paymentMethod: string;
  voucherCode?: string;
  specialRequests?: string;
  rooms: { roomId: number }[];
  guests: { fullName: string; phone: string; email: string; isPrimaryGuest: boolean }[];
}): Promise<{ bookingId: number; bookingCode: string }> {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Vui lòng đăng nhập bằng tài khoản khách hàng trước khi đặt phòng.');
  const response = await fetch(`${API_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.detail || result?.title || result?.message || 'Không tạo được booking. Vui lòng kiểm tra phòng trống lại.');
  }
  return result.data;
}
