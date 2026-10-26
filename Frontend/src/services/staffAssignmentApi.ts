import { getStoredAccessToken } from './authApi';

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

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function authorizedHeaders(includeJson = false): HeadersInit {
  const token = getStoredAccessToken();
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const error = await response.json().catch(() => null) as {
    detail?: string;
    message?: string;
    title?: string;
  } | null;
  return error?.detail || error?.message || error?.title || fallback;
}

/**
 * Lấy danh sách nhân viên và các phân khu phụ trách theo khách sạn (Admin Portal)
 */
export async function getHotelStaffAssignments(
  hotelId: number
): Promise<ApiResponse<StaffMember[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/hotels/${hotelId}/staff-assignments`, {
      headers: authorizedHeaders(),
    });
    if (!res.ok) {
      return { success: false, message: await readApiError(res, `Lỗi tải nhân viên (${res.status})`) };
    }
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến máy chủ.', errors: [String(error)] };
  }
}
/**
 * Lấy danh sách toàn bộ phân khu của khách sạn kèm thống kê phòng
 */
export async function getHotelAreas(
  hotelId: number
): Promise<ApiResponse<StaffAssignedArea[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/hotels/${hotelId}/staff-assignments/areas`, {
      headers: authorizedHeaders(),
    });
    if (!res.ok) {
      return { success: false, message: await readApiError(res, `Lỗi tải phân khu (${res.status})`) };
    }
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến máy chủ.', errors: [String(error)] };
  }
}
/**
 * Đồng bộ lưu danh sách phân khu cho nhân sự (Nút "Lưu phân công" trên Admin Modal)
 */
export async function syncStaffAreas(
  hotelId: number,
  userId: number,
  areaIds: number[]
): Promise<ApiResponse<StaffAssignedArea[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/hotels/${hotelId}/staff-assignments/sync`, {
      method: 'PUT',
      headers: authorizedHeaders(true),
      body: JSON.stringify({ userId, areaIds }),
    });

    if (!res.ok) {
      return { success: false, message: await readApiError(res, `Lỗi lưu phân công (${res.status})`) };
    }
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến máy chủ.', errors: [String(error)] };
  }
}

/**
 * Hủy phân công một phân khu cụ thể
 */
export async function removeAssignment(
  hotelId: number,
  assignmentId: number
): Promise<ApiResponse<boolean>> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/hotels/${hotelId}/staff-assignments/${assignmentId}`,
      { method: 'DELETE', headers: authorizedHeaders() }
    );
    if (!res.ok) {
      return { success: false, message: await readApiError(res, `Lỗi hủy phân công (${res.status})`) };
    }
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến máy chủ.', errors: [String(error)] };
  }
}

/**
 * Lấy các phân khu mà nhân viên đang đăng nhập được phụ trách (Staff Portal - Active Zone)
 */
export async function getMyAssignedAreas(
  hotelId?: number
): Promise<ApiResponse<StaffAssignedArea[]>> {
  try {
    const params = new URLSearchParams();
    if (hotelId) params.append('hotelId', String(hotelId));

    const url = `${API_BASE_URL}/api/staff/me/assigned-areas${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { headers: authorizedHeaders() });
    if (!res.ok) {
      return { success: false, message: await readApiError(res, `Lỗi tải phân khu của bạn (${res.status})`) };
    }
    return await res.json();
  } catch (error) {
    return { success: false, message: 'Không thể kết nối đến máy chủ.', errors: [String(error)] };
  }
}

