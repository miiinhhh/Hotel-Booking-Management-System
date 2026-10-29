import { apiClient, ApiResponse } from './apiClient';

export interface RoomTypeDto {
  roomTypeId: number;
  hotelId: number;
  areaId: number;
  name: string;
  description: string | null;
  basePrice: number;
  capacity: number;
  numberOfBeds: number;
  isActive: boolean;
}

export interface RoomPriceHistoryDto {
  priceHistoryId: number;
  roomTypeId: number;
  price: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  changedByUserId: number;
  createdAt: string;
}

export interface CreateRoomPriceHistoryRequest {
  price: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UpdateRoomTypeInput {
  name: string;
  description: string | null;
  basePrice: number;
  capacity: number;
  numberOfBeds: number;
}

export interface HotelDto {
  hotelId: number;
  hotelName: string;
  address?: string;
}

export interface HotelPageDto {
  items: HotelDto[];
  totalCount: number;
}

/**
 * Lấy danh sách khách sạn
 */
export async function getHotelsList(): Promise<ApiResponse<HotelPageDto>> {
  return apiClient<HotelPageDto>('/api/hotels?pageNumber=1&pageSize=50');
}

/**
 * Lấy danh sách hạng phòng theo khách sạn
 */
export async function getRoomTypesByHotel(hotelId: number): Promise<ApiResponse<RoomTypeDto[]>> {
  return apiClient<RoomTypeDto[]>(`/api/hotels/${hotelId}/room-types`);
}

/**
 * Lấy lịch sử cấu hình giá của một loại phòng
 */
export async function getRoomPriceHistories(
  hotelId: number,
  roomTypeId: number
): Promise<ApiResponse<RoomPriceHistoryDto[]>> {
  return apiClient<RoomPriceHistoryDto[]>(`/api/hotels/${hotelId}/room-types/${roomTypeId}/prices`);
}

/**
 * Tạo khoảng thời gian giá mới cho loại phòng
 */
export async function createRoomPriceHistory(
  hotelId: number,
  roomTypeId: number,
  input: CreateRoomPriceHistoryRequest
): Promise<ApiResponse<RoomPriceHistoryDto>> {
  return apiClient<RoomPriceHistoryDto>(`/api/hotels/${hotelId}/room-types/${roomTypeId}/prices`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Cập nhật giá bán cơ sở (BasePrice) mặc định của loại phòng
 */
export async function updateRoomTypeBasePrice(
  hotelId: number,
  roomTypeId: number,
  input: UpdateRoomTypeInput
): Promise<ApiResponse<RoomTypeDto>> {
  return apiClient<RoomTypeDto>(`/api/hotels/${hotelId}/room-types/${roomTypeId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
