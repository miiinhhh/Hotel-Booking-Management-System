import { ApiError, getStoredAccessToken } from './authApi';

export type RoomStatus = 'Available' | 'Occupied' | 'Maintenance' | 'Inactive';
export interface RoomTypeDto { roomTypeId: number; hotelId: number; areaId: number; name: string; description: string | null; basePrice: number; capacity: number; numberOfBeds: number; isActive: boolean }
export interface RoomTypeInput { name: string; description: string | null; basePrice: number; capacity: number; numberOfBeds: number }
export type HotelAreaType = 'Zone' | 'Building';
export interface HotelAreaDto {
  areaId: number;
  hotelId: number;
  areaName: string;
  areaType: HotelAreaType;
  parentAreaId: number | null;
  parentAreaName: string | null;
  description: string | null;
  locationDescription: string | null;
  floorCount: number | null;
  isActive: boolean;
  childAreaCount: number;
  roomTypeCount: number;
  roomCount: number;
  assignedStaffCount: number;
  createdAt: string;
  updatedAt: string | null;
}
export interface HotelAreaInput {
  areaName: string;
  areaType: HotelAreaType;
  parentAreaId: number | null;
  description: string | null;
  locationDescription: string | null;
  floorCount: number | null;
  isActive: boolean;
}
export interface RoomDto { roomId: number; hotelId: number; areaId: number; roomTypeId: number; roomNumber: string; floor: number; status: RoomStatus; description: string | null; isActive: boolean; price: number; capacity: number }
export interface AvailableRoom { roomId: number; hotelId: number; areaId: number; roomTypeId: number; roomTypeName: string; roomNumber: string; floor: number; price: number; capacity: number }
export interface Availability { checkIn: string; checkOut: string; rooms: AvailableRoom[] }
export interface RoomLock { lockId: number; batchId: string; hotelId: number; roomId: number; startsAt: string; endsAt: string; reason: string; createdByUserId: number; createdAt: string; status: 'Scheduled' | 'Active' | 'Expired' | 'Released' }
export interface LockInput { roomIds: number[]; startsAt: string; endsAt: string; reason: string }

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getStoredAccessToken();
  const response = await fetch(`${base}${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const validation = error?.errors ? Object.values(error.errors).flat().join(' ') : '';
    throw new ApiError(error?.detail || validation || error?.title || `Yêu cầu thất bại (${response.status}).`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
const hotel = (id: number) => `/api/hotels/${id}`;
export const roomApi = {
  hotel: (id: number) => request<{ hotelId: number; hotelName: string; address: string }>(hotel(id)),
  types: (id: number) => request<RoomTypeDto[]>(`${hotel(id)}/room-types`),
  areas: (id: number, includeInactive = false) => request<HotelAreaDto[]>(`${hotel(id)}/areas${includeInactive ? '?includeInactive=true' : ''}`),
  area: (id: number, areaId: number) => request<HotelAreaDto>(`${hotel(id)}/areas/${areaId}`),
  createArea: (id: number, input: HotelAreaInput) => request<HotelAreaDto>(`${hotel(id)}/areas`, 'POST', input),
  updateArea: (id: number, areaId: number, input: HotelAreaInput) => request<HotelAreaDto>(`${hotel(id)}/areas/${areaId}`, 'PUT', input),
  deleteArea: (id: number, areaId: number) => request<void>(`${hotel(id)}/areas/${areaId}`, 'DELETE'),
  rooms: (id: number) => request<RoomDto[]>(`${hotel(id)}/rooms`),
  createType: (id: number, areaId: number, input: RoomTypeInput) => request<RoomTypeDto>(`${hotel(id)}/areas/${areaId}/room-types`, 'POST', input),
  updateType: (id: number, typeId: number, input: RoomTypeInput) => request<RoomTypeDto>(`${hotel(id)}/room-types/${typeId}`, 'PUT', input),
  typeStatus: (id: number, typeId: number, isActive: boolean) => request<RoomTypeDto>(`${hotel(id)}/room-types/${typeId}/status`, 'PATCH', { isActive }),
  deleteType: (id: number, typeId: number) => request<void>(`${hotel(id)}/room-types/${typeId}`, 'DELETE'),
  createRoom: (id: number, areaId: number, input: Omit<RoomDto, 'roomId' | 'hotelId' | 'areaId' | 'price' | 'capacity' | 'isActive'>) => request<RoomDto>(`${hotel(id)}/areas/${areaId}/rooms`, 'POST', input),
  updateRoom: (id: number, roomId: number, input: Omit<RoomDto, 'roomId' | 'hotelId' | 'areaId' | 'price' | 'capacity' | 'isActive'>) => request<RoomDto>(`${hotel(id)}/rooms/${roomId}`, 'PUT', input),
  deleteRoom: (id: number, roomId: number) => request<void>(`${hotel(id)}/rooms/${roomId}`, 'DELETE'),
  availability: (id: number, checkIn: string, checkOut: string) => request<Availability>(`${hotel(id)}/rooms/availability?${new URLSearchParams({ checkIn, checkOut })}`),
  locks: (id: number) => request<RoomLock[]>(`${hotel(id)}/rooms/emergency-locks`),
  lock: (id: number, input: LockInput) => request<RoomLock[]>(`${hotel(id)}/rooms/emergency-locks`, 'POST', input),
  release: (id: number, lockId: number) => request<RoomLock>(`${hotel(id)}/rooms/emergency-locks/${lockId}/release`, 'PATCH'),
};

export const localDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
