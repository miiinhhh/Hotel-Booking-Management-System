import { apiClient, ApiResponse } from './apiClient';

export interface VoucherResponseDto {
  voucherId: number;
  code: string;
  voucherType: 'Percentage' | 'FixedAmount' | string;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimitPerCustomer: number;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VoucherFilterRequest {
  code?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateVoucherRequest {
  code: string;
  voucherType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount?: number | null;
  usageLimitPerCustomer?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number | null;
}

export interface UpdateVoucherRequest {
  voucherType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount?: number | null;
  usageLimitPerCustomer?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number | null;
  isActive: boolean;
}

/**
 * Lấy danh sách mã voucher có phân trang và bộ lọc
 */
export async function getVouchersList(
  filter: VoucherFilterRequest = {}
): Promise<ApiResponse<PagedResult<VoucherResponseDto>>> {
  const params = new URLSearchParams();
  if (filter.code) params.set('code', filter.code);
  if (filter.isActive !== undefined) params.set('isActive', String(filter.isActive));
  params.set('page', String(filter.page || 1));
  params.set('pageSize', String(filter.pageSize || 20));

  return apiClient<PagedResult<VoucherResponseDto>>(`/api/vouchers?${params.toString()}`);
}

/**
 * Lấy chi tiết voucher theo ID
 */
export async function getVoucherById(id: number): Promise<ApiResponse<VoucherResponseDto>> {
  return apiClient<VoucherResponseDto>(`/api/vouchers/${id}`);
}

/**
 * Tạo mã voucher mới
 */
export async function createVoucher(
  request: CreateVoucherRequest
): Promise<ApiResponse<VoucherResponseDto>> {
  return apiClient<VoucherResponseDto>('/api/vouchers', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Cập nhật thông tin voucher
 */
export async function updateVoucher(
  id: number,
  request: UpdateVoucherRequest
): Promise<ApiResponse<VoucherResponseDto>> {
  return apiClient<VoucherResponseDto>(`/api/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

/**
 * Bật / Tắt trạng thái kích hoạt của voucher
 */
export async function toggleVoucherStatus(
  id: number
): Promise<ApiResponse<{ voucherId: number; isActive: boolean }>> {
  return apiClient<{ voucherId: number; isActive: boolean }>(`/api/vouchers/${id}/toggle-status`, {
    method: 'PATCH',
  });
}

/**
 * Xóa mềm / vô hiệu hóa voucher
 */
export async function deleteVoucher(id: number): Promise<ApiResponse<void>> {
  return apiClient<void>(`/api/vouchers/${id}`, {
    method: 'DELETE',
  });
}
