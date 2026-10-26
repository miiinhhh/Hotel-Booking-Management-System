export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface UserTokenPayload {
  userId: number;
  email?: string;
  fullName?: string;
  roles: string[];
  hotelId?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Lấy token từ localStorage hoặc sessionStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

/**
 * Lưu token và thông tin người dùng
 */
export function setAuthToken(token: string, persist = true) {
  if (persist) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
}

/**
 * Xóa token khi đăng xuất
 */
export function clearAuthToken() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
}

/**
 * Giải mã JWT payload để lấy thông tin userId, role, v.v.
 */
export function parseJwtPayload(token: string): UserTokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    
    // Trích xuất claim role (chuẩn Microsoft hoặc JWT spec)
    const rawRoles =
      parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      parsed.role ||
      parsed.roles ||
      [];
    const roles: string[] = Array.isArray(rawRoles) ? rawRoles : [rawRoles].filter(Boolean);

    const userIdStr =
      parsed.sub ||
      parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      parsed.userId ||
      parsed.id;
    const userId = Number(userIdStr) || 0;

    const fullName =
      parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      parsed.name ||
      parsed.fullName ||
      '';

    const email =
      parsed.email ||
      parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      '';

    const hotelId = parsed.hotelId ? Number(parsed.hotelId) : undefined;

    return {
      userId,
      email,
      fullName,
      roles,
      hotelId,
    };
  } catch (err) {
    console.warn('Lỗi phân tích JWT Token:', err);
    return null;
  }
}

/**
 * Lấy thông tin user hiện tại từ token đang lưu
 */
export function getCurrentUser(): UserTokenPayload | null {
  const token = getAuthToken();
  if (!token) return null;
  return parseJwtPayload(token);
}

/**
 * apiClient bọc fetch: Tự động gắn Authorization Bearer và Content-Type
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Đảm bảo endpoint bắt đầu với /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      return {
        success: false,
        message:
          errorJson?.message ||
          errorJson?.title ||
          `Yêu cầu thất bại với mã lỗi HTTP ${res.status}`,
        errors: errorJson?.errors ? Object.values(errorJson.errors).flat() as string[] : undefined,
      };
    }

    if (res.status === 204) {
      return { success: true } as ApiResponse<T>;
    }

    const data = await res.json();
    // Nếu backend đã bọc sẵn ApiResponse { success, data, message }
    if (typeof data === 'object' && data !== null && 'success' in data) {
      return data as ApiResponse<T>;
    }

    // Nếu backend trả trực tiếp dữ liệu DTO/Array
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ API. Vui lòng kiểm tra lại dịch vụ Backend.',
      errors: [String(error)],
    };
  }
}
