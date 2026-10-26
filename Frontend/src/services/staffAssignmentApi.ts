import { apiClient, ApiResponse } from './apiClient';

export interface StaffAssignedArea {
  areaId: number;
  hotelId: number;
  areaName: string;
  areaType: string; // "Zone" | "Building"
  parentAreaId?: number;
  parentAreaName?: string;
  description?: string;
  floorCount?: number;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  assignedAt?: string;
  isActive: boolean;
}

export interface StaffMember {
  userId: number;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  assignedAreas: StaffAssignedArea[];
}

export interface AssignStaffAreasRequest {
  userId: number;
  areaIds: number[];
}

/**
 * Lấy danh sách nhân viên và các phân khu phụ trách theo khách sạn (Admin Portal)
 */
export async function getHotelStaffAssignments(
  hotelId: number
): Promise<ApiResponse<StaffMember[]>> {
  return apiClient<StaffMember[]>(`/api/hotels/${hotelId}/staff-assignments`);
}

/**
 * Lấy danh sách toàn bộ phân khu của khách sạn kèm thống kê phòng
 */
export async function getHotelAreas(
  hotelId: number
): Promise<ApiResponse<StaffAssignedArea[]>> {
  return apiClient<StaffAssignedArea[]>(`/api/hotels/${hotelId}/staff-assignments/areas`);
}

/**
 * Đồng bộ lưu danh sách phân khu cho nhân sự (Nút "Lưu phân công" trên Admin Modal)
 */
export async function syncStaffAreas(
  hotelId: number,
  userId: number,
  areaIds: number[]
): Promise<ApiResponse<StaffAssignedArea[]>> {
  return apiClient<StaffAssignedArea[]>(`/api/hotels/${hotelId}/staff-assignments/sync`, {
    method: 'PUT',
    body: JSON.stringify({ userId, areaIds }),
  });
}

/**
 * Hủy phân công một phân khu cụ thể
 */
export async function removeAssignment(
  hotelId: number,
  assignmentId: number
): Promise<ApiResponse<boolean>> {
  return apiClient<boolean>(`/api/hotels/${hotelId}/staff-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

/**
 * Lấy các phân khu mà nhân viên đang đăng nhập được phụ trách (Staff Portal - Active Zone)
 */
export async function getMyAssignedAreas(
  userId?: number,
  hotelId?: number
): Promise<ApiResponse<StaffAssignedArea[]>> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', String(userId));
  if (hotelId) params.append('hotelId', String(hotelId));

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient<StaffAssignedArea[]>(`/api/staff/me/assigned-areas${query}`);
}
