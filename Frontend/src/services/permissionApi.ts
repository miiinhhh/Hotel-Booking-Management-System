import { API_BASE_URL, ApiError, getStoredAccessToken } from './authApi';

export interface PermissionDto { permissionId: number; code: string; name: string; group: string; description: string | null }
export interface RoleDto { roleId: number; name: string; description: string | null; isSystem: boolean; isActive: boolean; userCount: number; permissions: string[] }
export interface UserRolesDto { userId: number; fullName: string; email: string; roles: string[] }
export interface AdminUserDto { userId: number; fullName: string; email: string; phone: string | null; dateOfBirth: string | null; isActive: boolean; roles: string[] }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(problem?.detail || problem?.title || `Yêu cầu không thành công (${response.status}).`, response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const permissionApi = {
  permissions: () => request<PermissionDto[]>('/api/admin/permissions'),
  roles: () => request<RoleDto[]>('/api/admin/roles'),
  createRole: (name: string, description: string) => request<RoleDto>('/api/admin/roles', { method: 'POST', body: JSON.stringify({ name, description: description || null }) }),
  updateRole: (role: RoleDto) => request<RoleDto>(`/api/admin/roles/${role.roleId}`, { method: 'PUT', body: JSON.stringify({ name: role.name, description: role.description, isActive: role.isActive }) }),
  setPermissions: (roleId: number, permissionCodes: string[]) => request<RoleDto>(`/api/admin/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionCodes }) }),
  deleteRole: (roleId: number) => request<void>(`/api/admin/roles/${roleId}`, { method: 'DELETE' }),
  userRoles: (userId: number) => request<UserRolesDto>(`/api/admin/users/${userId}/roles`),
  setUserRoles: (userId: number, roleIds: number[]) => request<UserRolesDto>(`/api/admin/users/${userId}/roles`, { method: 'PUT', body: JSON.stringify({ roleIds }) }),
  users: () => request<AdminUserDto[]>('/api/admin/users'),
  updateUser: (userId: number, input: { fullName: string; phone: string; dateOfBirth: string }) => request<AdminUserDto>(`/api/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify({ fullName: input.fullName, phone: input.phone || null, dateOfBirth: input.dateOfBirth || null }) }),
  setUserStatus: (userId: number, isActive: boolean) => request<AdminUserDto>(`/api/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
};

