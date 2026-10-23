export interface AuthResponse {
  userId: number;
  fullName: string;
  email: string;
  roles: string[];
  accessToken: string;
  expiresAt: string;
  tokenType: 'Bearer';
}

export interface AccountProfile {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  roles: string[];
}

export interface StaffAccount {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  roles: string[];
}

export interface StaffPage {
  items: StaffAccount[];
  page: number;
  pageSize: number;
  total: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export const AUTH_STORAGE_KEY = 'stayluxe.auth';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getStoredAccessToken(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Pick<AuthResponse, 'accessToken' | 'expiresAt'>;
    return new Date(session.expiresAt).getTime() > Date.now() ? session.accessToken : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.', 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      detail?: string;
      title?: string;
      message?: string;
      errors?: Record<string, string[]> | string[];
    } | null;
    const validation = payload?.errors && !Array.isArray(payload.errors)
      ? Object.values(payload.errors).flat()[0]
      : Array.isArray(payload?.errors) ? payload.errors[0] : undefined;
    const fallback = response.status === 401
      ? 'Email hoặc mật khẩu không chính xác.'
      : `Yêu cầu không thành công (${response.status}).`;
    throw new ApiError(payload?.detail || payload?.message || validation || payload?.title || fallback, response.status);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (input: { fullName: string; email: string; password: string; phone?: string; dateOfBirth?: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        phone: input.phone || null,
        dateOfBirth: input.dateOfBirth ? `${input.dateOfBirth}T00:00:00` : null,
      }),
    }),

  getProfile: (token: string) => request<AccountProfile>('/api/me', {}, token),

  updateProfile: (token: string, input: { fullName: string; phone: string; dateOfBirth: string }) =>
    request<AccountProfile>('/api/me', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: input.fullName,
        phone: input.phone || null,
        dateOfBirth: input.dateOfBirth ? `${input.dateOfBirth}T00:00:00.000Z` : null,
      }),
    }, token),

  listStaff: (token: string, page = 1, pageSize = 50) =>
    request<StaffPage>(`/api/staff?page=${page}&pageSize=${pageSize}`, {}, token),

  updateStaff: (token: string, userId: number, input: { fullName: string; phone: string; dateOfBirth: string }) =>
    request<StaffAccount>(`/api/staff/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...input, phone: input.phone || null, dateOfBirth: input.dateOfBirth || null }),
    }, token),

  setStaffStatus: (token: string, userId: number, isActive: boolean) =>
    request<StaffAccount>(`/api/staff/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }, token),
};
