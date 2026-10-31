import { loadAllStaff } from './staffPagination';

export interface AuthResponse {
  userId: number;
  fullName: string;
  email: string;
  roles: string[];
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
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
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
}

export interface AccountAvailability { emailAvailable: boolean; phoneAvailable: boolean; }
export interface OtpChallenge { challengeId: string; expiresAt: string; resendAfterSeconds: number; }
export type OtpChannel = 'Email' | 'Phone';
export type OtpPurpose = 'Login' | 'PasswordReset';

export interface StaffAccount {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  roles: string[];
}

export interface StaffPage { items: StaffAccount[]; page: number; pageSize: number; total: number; }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); }
}

export const AUTH_STORAGE_KEY = 'stayluxe.auth';
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const absoluteApiUrl = (path: string | null) => path ? `${API_BASE_URL}${path}` : null;

export function getStoredSession(): AuthResponse | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthResponse;
    return session.refreshToken && new Date(session.refreshExpiresAt).getTime() > Date.now() ? session : null;
  } catch { return null; }
}

export function getStoredAccessToken(): string | null {
  const session = getStoredSession();
  return session && new Date(session.expiresAt).getTime() > Date.now() ? session.accessToken : null;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  const isForm = init.body instanceof FormData;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch { throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.', 0); }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      detail?: string; title?: string; message?: string; code?: string;
      errors?: Record<string, string[]> | string[];
    } | null;
    const validation = payload?.errors && !Array.isArray(payload.errors)
      ? Object.values(payload.errors).flat()[0]
      : Array.isArray(payload?.errors) ? payload.errors[0] : undefined;
    const fallback = response.status === 401 ? 'Phiên xác thực không hợp lệ.' : `Yêu cầu không thành công (${response.status}).`;
    throw new ApiError(payload?.detail || payload?.message || validation || payload?.title || fallback, response.status, payload?.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  registrationAvailability: (email?: string, phone?: string) => {
    const query = new URLSearchParams();
    if (email) query.set('email', email); if (phone) query.set('phone', phone);
    return request<AccountAvailability>(`/api/auth/availability?${query}`);
  },
  login: (email: string, password: string, rememberMe: boolean) => request<AuthResponse>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password, rememberMe }),
  }),
  register: (input: { fullName: string; email: string; password: string; phone?: string; dateOfBirth?: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ ...input, phone: input.phone || null, dateOfBirth: input.dateOfBirth ? `${input.dateOfBirth}T00:00:00` : null }),
    }),
  refresh: (refreshToken: string) => request<AuthResponse>('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) => request<void>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logoutAll: (token: string) => request<void>('/api/auth/logout-all', { method: 'POST' }, token),
  requestOtp: (destination: string, channel: OtpChannel, purpose: OtpPurpose) => request<OtpChallenge>('/api/auth/otp/request', {
    method: 'POST', body: JSON.stringify({ destination, channel, purpose }),
  }),
  verifyOtp: (challengeId: string, code: string, rememberMe: boolean) => request<AuthResponse>('/api/auth/otp/verify', {
    method: 'POST', body: JSON.stringify({ challengeId, code, rememberMe }),
  }),
  resetPassword: (challengeId: string, code: string, newPassword: string) => request<void>('/api/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ challengeId, code, newPassword }),
  }),
  google: (idToken: string, rememberMe: boolean) => request<AuthResponse>('/api/auth/google', {
    method: 'POST', body: JSON.stringify({ idToken, rememberMe }),
  }),
  getProfile: (token: string) => request<AccountProfile>('/api/me', {}, token),
  updateProfile: (token: string, input: { fullName: string; email: string; phone: string; dateOfBirth: string }) =>
    request<AccountProfile>('/api/me', {
      method: 'PUT', body: JSON.stringify({
        fullName: input.fullName, email: input.email, phone: input.phone || null,
        dateOfBirth: input.dateOfBirth ? `${input.dateOfBirth}T00:00:00.000Z` : null,
      }),
    }, token),
  availability: (token: string, email?: string, phone?: string) => {
    const query = new URLSearchParams();
    if (email) query.set('email', email); if (phone) query.set('phone', phone);
    return request<AccountAvailability>(`/api/me/availability?${query}`, {}, token);
  },
  reauthenticate: (token: string, password: string) => request<{ verifiedAt: string; validForSeconds: number }>('/api/me/reauthenticate', {
    method: 'POST', body: JSON.stringify({ password }),
  }, token),
  changePassword: (token: string, currentPassword: string, newPassword: string) => request<void>('/api/me/change-password', {
    method: 'POST', body: JSON.stringify({ currentPassword, newPassword }),
  }, token),
  uploadAvatar: (token: string, file: File) => {
    const form = new FormData(); form.append('file', file);
    return request<AccountProfile>('/api/me/avatar', { method: 'PUT', body: form }, token);
  },
  deleteAvatar: (token: string) => request<void>('/api/me/avatar', { method: 'DELETE' }, token),
  listStaff: (token: string, page = 1, pageSize = 50) => request<StaffPage>(`/api/staff?page=${page}&pageSize=${pageSize}`, {}, token),
  listAllStaff: (token: string) => loadAllStaff((page) => request<StaffPage>(`/api/staff?page=${page}&pageSize=100`, {}, token)),
  updateStaff: (token: string, userId: number, input: { fullName: string; phone: string; dateOfBirth: string }) =>
    request<StaffAccount>(`/api/staff/${userId}`, { method: 'PUT', body: JSON.stringify({ ...input, phone: input.phone || null, dateOfBirth: input.dateOfBirth || null }) }, token),
  setStaffStatus: (token: string, userId: number, isActive: boolean) => request<StaffAccount>(`/api/staff/${userId}/status`, {
    method: 'PATCH', body: JSON.stringify({ isActive }),
  }, token),
};
