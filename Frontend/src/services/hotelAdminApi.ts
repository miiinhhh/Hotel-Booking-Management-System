import { apiClient, ApiResponse } from './apiClient';

/** Khách sạn đầy đủ thông tin (GET/POST/PUT /api/hotels). Giờ dạng "HH:mm:ss". */
export interface HotelAdminDto {
  hotelId: number;
  hotelName: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string | null;
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export type HotelInput = Omit<HotelAdminDto, 'hotelId' | 'createdAt' | 'updatedAt'>;

export const hotelAdminApi = {
  list: (): Promise<ApiResponse<{ items: HotelAdminDto[]; totalCount: number }>> =>
    apiClient('/api/hotels?pageNumber=1&pageSize=100'),
  create: (input: HotelInput): Promise<ApiResponse<HotelAdminDto>> =>
    apiClient('/api/hotels', { method: 'POST', body: JSON.stringify(input) }),
  update: (hotelId: number, input: HotelInput): Promise<ApiResponse<HotelAdminDto>> =>
    apiClient(`/api/hotels/${hotelId}`, { method: 'PUT', body: JSON.stringify(input) }),
  /** Chính sách hủy hiển thị cho khách ở trang khách sạn. */
  setPolicy: (hotelId: number, cancellationPolicy: string | null): Promise<ApiResponse<unknown>> =>
    apiClient(`/api/hotels/${hotelId}/policy`, { method: 'PUT', body: JSON.stringify({ cancellationPolicy }) }),
};

// ===================== Quy tắc tăng giá theo ngày =====================
export type SurgeAdjustmentType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface SurgeRuleDto {
  ruleId: number;
  hotelId: number;
  roomTypeId: number | null;
  roomTypeName: string | null;
  ruleName: string;
  startDate: string;
  endDate: string;
  adjustmentType: SurgeAdjustmentType;
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface SurgeRuleInput {
  hotelId: number;
  roomTypeId: number | null;
  ruleName: string;
  startDate: string;
  endDate: string;
  adjustmentType: SurgeAdjustmentType;
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
}

export const surgeRuleApi = {
  list: (hotelId: number): Promise<ApiResponse<SurgeRuleDto[]>> => apiClient(`/api/pricing/surge-rules?hotelId=${hotelId}`),
  create: (input: SurgeRuleInput): Promise<ApiResponse<SurgeRuleDto>> =>
    apiClient('/api/pricing/surge-rules', { method: 'POST', body: JSON.stringify(input) }),
  update: (ruleId: number, input: Omit<SurgeRuleInput, 'hotelId' | 'roomTypeId'>): Promise<ApiResponse<SurgeRuleDto>> =>
    apiClient(`/api/pricing/surge-rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(input) }),
  toggle: (ruleId: number): Promise<ApiResponse<unknown>> => apiClient(`/api/pricing/surge-rules/${ruleId}/toggle`, { method: 'PATCH' }),
  remove: (ruleId: number): Promise<ApiResponse<unknown>> => apiClient(`/api/pricing/surge-rules/${ruleId}`, { method: 'DELETE' }),
};
