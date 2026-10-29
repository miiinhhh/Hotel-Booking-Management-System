import { apiClient, ApiResponse } from './apiClient';

export interface CancellationPolicyDto {
  cancellationPolicyId: number;
  hotelId: number;
  policyName: string;
  daysBeforeCheckIn: number;
  refundPercentage: number;
  depositPenaltyPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCancellationPolicyRequest {
  hotelId: number;
  policyName: string;
  daysBeforeCheckIn: number;
  refundPercentage: number;
  depositPenaltyPercentage: number;
  isActive?: boolean;
}

export interface UpdateCancellationPolicyRequest {
  policyName: string;
  daysBeforeCheckIn: number;
  refundPercentage: number;
  depositPenaltyPercentage: number;
  isActive?: boolean;
}

/**
 * Lấy danh sách chính sách hủy theo khách sạn
 */
export async function getCancellationPoliciesByHotel(
  hotelId: number,
  activeOnly = false
): Promise<ApiResponse<CancellationPolicyDto[]>> {
  return apiClient<CancellationPolicyDto[]>(
    `/api/cancellation-policies/hotel/${hotelId}?activeOnly=${activeOnly}`
  );
}

/**
 * Lấy chi tiết chính sách hủy theo ID
 */
export async function getCancellationPolicyById(
  id: number
): Promise<ApiResponse<CancellationPolicyDto>> {
  return apiClient<CancellationPolicyDto>(`/api/cancellation-policies/${id}`);
}

/**
 * Tạo chính sách hủy phòng mới
 */
export async function createCancellationPolicy(
  request: CreateCancellationPolicyRequest
): Promise<ApiResponse<CancellationPolicyDto>> {
  return apiClient<CancellationPolicyDto>('/api/cancellation-policies', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Cập nhật chính sách hủy phòng
 */
export async function updateCancellationPolicy(
  id: number,
  request: UpdateCancellationPolicyRequest
): Promise<ApiResponse<CancellationPolicyDto>> {
  return apiClient<CancellationPolicyDto>(`/api/cancellation-policies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

/**
 * Xóa chính sách hủy phòng
 */
export async function deleteCancellationPolicy(id: number): Promise<ApiResponse<void>> {
  return apiClient<void>(`/api/cancellation-policies/${id}`, {
    method: 'DELETE',
  });
}
