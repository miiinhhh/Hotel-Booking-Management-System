import { apiClient, ApiResponse } from './apiClient';

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

export interface CancelBookingRequest {
  reason: string;
}

export interface ConfirmPaymentRequest {
  isSuccessful: boolean;
}

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
