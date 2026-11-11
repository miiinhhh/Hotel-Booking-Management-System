import { ApiError, getStoredAccessToken } from './authApi';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export interface AmenityDto {
  amenityId: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ImageDto {
  imageId: number;
  url: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
  originalFileName: string | null;
  contentType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
}

export type ContentScope = { hotelId: number; roomId?: number };

const scopePath = (scope: ContentScope) => scope.roomId
  ? `/api/hotels/${scope.hotelId}/rooms/${scope.roomId}`
  : `/api/hotels/${scope.hotelId}`;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(BASE + path, { ...init, headers });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const validation = problem?.errors ? Object.values(problem.errors).flat().join(' ') : '';
    throw new ApiError(problem?.detail || validation || problem?.title || `Yêu cầu thất bại (${response.status}).`, response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const propertyContentApi = {
  amenities: () => request<AmenityDto[]>('/api/amenities'),
  createAmenity: (name: string, description: string | null) => request<AmenityDto>('/api/amenities', {
    method: 'POST', body: JSON.stringify({ name, description }),
  }),
  updateAmenity: (id: number, name: string, description: string | null) => request<AmenityDto>(`/api/amenities/${id}`, {
    method: 'PUT', body: JSON.stringify({ name, description }),
  }),
  deleteAmenity: (id: number) => request<void>(`/api/amenities/${id}`, { method: 'DELETE' }),
  linkedAmenities: (scope: ContentScope) => request<AmenityDto[]>(`${scopePath(scope)}/amenities`),
  setAmenity: (scope: ContentScope, amenityId: number, assigned: boolean) => request<void>(
    `${scopePath(scope)}/amenities/${amenityId}`, { method: assigned ? 'PUT' : 'DELETE' }),
  images: (scope: ContentScope) => request<ImageDto[]>(`${scopePath(scope)}/images`),
  uploadImage: (scope: ContentScope, file: File, altText: string, isPrimary: boolean) => {
    const body = new FormData();
    body.append('file', file);
    if (altText.trim()) body.append('altText', altText.trim());
    body.append('isPrimary', String(isPrimary));
    return request<ImageDto>(`${scopePath(scope)}/images`, { method: 'POST', body });
  },
  deleteImage: (scope: ContentScope, imageId: number) => request<void>(
    `${scopePath(scope)}/images/${imageId}`, { method: 'DELETE' }),
  selectPrimary: (scope: ContentScope, imageId: number) => request<void>(
    `${scopePath(scope)}/images/${imageId}/primary`, { method: 'PUT' }),
  reorderImages: (scope: ContentScope, imageIds: number[]) => request<void>(
    `${scopePath(scope)}/images/order`, { method: 'PUT', body: JSON.stringify({ imageIds }) }),
};

export const propertyImageUrl = (url: string) => url.startsWith('/api/') ? BASE + url : url;
