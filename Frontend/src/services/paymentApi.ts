import { apiClient, ApiResponse } from './apiClient';

export interface VnPayPaymentResponse {
  paymentId: number;
  bookingId: number;
  bookingCode: string;
  txnRef: string;
  amount: number;
  paymentUrl: string;
  createdAt: string;
}

export interface VnPayCallbackResult {
  success: boolean;
  message: string;
  bookingId: number;
  bookingCode: string;
  txnRef: string;
  transactionNo?: string;
  amount: number;
  status: string;
  paidAt?: string;
}

export interface PaymentHistoryDto {
  paymentId: number;
  bookingId: number;
  bookingCode: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  status: string;
  transactionCode: string;
  createdAt: string;
  paidAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Khởi tạo giao dịch thanh toán VNPay và nhận URL redirect sang Sandbox
 */
export async function createVnPayPayment(
  bookingId: number,
  paymentTarget: 'Deposit' | 'Full' = 'Deposit'
): Promise<ApiResponse<VnPayPaymentResponse>> {
  return apiClient<VnPayPaymentResponse>('/api/payments/vnpay/create-payment', {
    method: 'POST',
    body: JSON.stringify({ bookingId, paymentTarget }),
  });
}

/**
 * Tra cứu trạng thái giao dịch VNPay theo mã tham chiếu TxnRef (đã được Backend xác minh chữ ký)
 */
export async function getPaymentStatusByTxnRef(
  txnRef: string
): Promise<ApiResponse<VnPayCallbackResult>> {
  return apiClient<VnPayCallbackResult>(`/api/payments/vnpay/status/${encodeURIComponent(txnRef)}`);
}

/**
 * Lịch sử thanh toán của khách hàng hiện tại
 */
export async function getMyPaymentHistory(
  page = 1,
  pageSize = 10
): Promise<ApiResponse<PagedResult<PaymentHistoryDto>>> {
  return apiClient<PagedResult<PaymentHistoryDto>>(`/api/payments/my-history?page=${page}&pageSize=${pageSize}`);
}

/**
 * Lịch sử thanh toán theo đơn đặt phòng
 */
export async function getBookingPayments(
  bookingId: number,
  page = 1,
  pageSize = 10
): Promise<ApiResponse<PagedResult<PaymentHistoryDto>>> {
  return apiClient<PagedResult<PaymentHistoryDto>>(`/api/bookings/${bookingId}/payments?page=${page}&pageSize=${pageSize}`);
}
