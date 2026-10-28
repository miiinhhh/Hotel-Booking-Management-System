import { ApiError, getStoredAccessToken } from './authApi';
import type { Hotel } from '../pages/search/types';
import type { HotelDetail, Room } from '../pages/hotel-detail/types';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const mediaUrl = (url?: string | null) => !url ? '/room-placeholder.svg' : url.startsWith('/api/') ? BASE + url : url;
export function day(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export interface DiscoverySelection { location: string; checkIn: string; checkOut: string; adults: number; children: number; rooms: number; dates: string; guests: string }
export const defaultSelection = (): DiscoverySelection => ({ location: '', checkIn: day(), checkOut: day(1), adults: 2, children: 0, rooms: 1, dates: '', guests: '' });
export function query(input: Record<string, unknown>) { return new URLSearchParams(Object.entries(input).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString(); }
export async function discoveryRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAccessToken();
  let response: Response;
  try { response = await fetch(BASE + path, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } }); }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') throw error; throw new ApiError('Không kết nối được máy chủ. Hãy thử lại.', 0); }
  if (!response.ok) { const error = await response.json().catch(() => null); throw new ApiError(error?.detail || error?.title || `Yêu cầu thất bại (${response.status}).`, response.status); }
  return response.status === 204 ? undefined as T : response.json();
}
export interface HotelCardData { hotelId: number; name: string; address: string; city: string; imageUrl: string | null; roomTypeName: string; pricePerNight: number; availableRooms: number; capacity: number }
export interface DiscoveryPage { items: HotelCardData[]; totalCount: number; page: number; pageSize: number; totalPages: number; message: string | null }
interface Amenity { amenityId: number; name: string; description: string | null }
export interface HotelDetailData { hotelId: number; name: string; address: string; city: string; description: string | null; policies: { checkInTime: string; checkOutTime: string; cancellationPolicy: string | null }; images: { url: string; altText: string | null; isPrimary: boolean }[]; amenities: Amenity[]; rooms: { roomId: number; name: string; roomNumber: string; floor: number; pricePerNight: number; capacity: number; imageUrl: string | null; amenities: Amenity[] }[]; checkIn: string; checkOut: string }
export interface BusinessReport { from: string; to: string; revenue: number; bookingCount: number; cancelledBookings: number; cancellationRate: number; occupancyRate: number; occupiedRoomNights: number; availableRoomNights: number; days: { date: string; revenue: number; bookings: number; occupiedRoomNights: number; availableRoomNights: number }[] }
export const discoveryApi = {
  search: (input: Record<string, unknown>, signal?: AbortSignal) => discoveryRequest<DiscoveryPage>('/api/discovery/hotels?' + query(input), { signal }),
  detail: (id: number, input: DiscoverySelection) => discoveryRequest<HotelDetailData>(`/api/discovery/hotels/${id}?` + query({ checkIn: input.checkIn, checkOut: input.checkOut, adults: input.adults, children: input.children, rooms: input.rooms })),
  wishlist: () => discoveryRequest<HotelCardData[]>('/api/me/wishlist'),
  save: (id: number, value: boolean) => discoveryRequest<void>(`/api/me/wishlist/${id}`, { method: value ? 'PUT' : 'DELETE' }),
  amenities: () => discoveryRequest<Amenity[]>('/api/amenities'),
  report: (input: Record<string, unknown>, signal?: AbortSignal) => discoveryRequest<BusinessReport>('/api/admin/reports/overview?' + query(input), { signal }),
  async exportReport(input: Record<string, unknown>) {
    const token = getStoredAccessToken();
    const response = await fetch(BASE + '/api/admin/reports/export?' + query(input), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new ApiError('Không thể xuất báo cáo. Kiểm tra quyền và khoảng thời gian.', response.status);
    const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a'); a.href = url; a.download = 'bao-cao-khach-san.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
export function toHotel(h: HotelCardData, favorite = false): Hotel { return { id: String(h.hotelId), name: h.name, location: `${h.address}, ${h.city}`, image: mediaUrl(h.imageUrl), imageAlt: h.name, starRating: 0, ratingScore: 0, ratingText: 'Chưa có đánh giá', reviewCount: 0, amenities: [{ icon: 'hotel', text: `${h.availableRooms} phòng khả dụng` }], featuredRoomType: h.roomTypeName, pricePerNight: h.pricePerNight, isFavorite: favorite }; }
export function toHotelDetail(h: HotelDetailData, selection: DiscoverySelection): HotelDetail {
  const policy = h.policies.cancellationPolicy || 'Khách sạn chưa công bố chính sách hủy. Vui lòng liên hệ trước khi đặt.';
  const rooms: Room[] = h.rooms.map(r => ({ id: String(r.roomId), roomId: r.roomId, hotelId: h.hotelId, hotelName: h.name, hotelAddress: h.address, checkIn: h.checkIn, checkOut: h.checkOut, requestedGuests: selection.adults + selection.children, name: `${r.name} · ${r.roomNumber}`, tag: 'Còn phòng', floor: `Tầng ${r.floor}`, remainingRooms: 1, image: mediaUrl(r.imageUrl), specs: [{ icon: 'person', text: `${r.capacity} khách` }], features: r.amenities.map(a => ({ icon: 'check', text: a.name })), packages: [{ id: 'base', name: 'Giá tham khảo', description: 'Giá được máy chủ xác nhận khi đặt.', pricePerNight: r.pricePerNight }], cancellationPolicy: policy }));
  const images = [...h.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return { id: String(h.hotelId), checkIn: h.checkIn, checkOut: h.checkOut, guestsPerRoom: Math.ceil((selection.adults + selection.children) / selection.rooms), name: h.name, address: `${h.address}, ${h.city}`, categoryTag: 'Khách sạn', starRating: 0, distanceToBeach: '', ratingScore: 0, ratingText: 'Chưa có đánh giá', reviewCount: 0,
    galleryImages: { hero: { url: mediaUrl(images[0]?.url), caption: images[0]?.altText || h.name, badge: '' }, thumbnails: images.slice(1).map(i => ({ url: mediaUrl(i.url), caption: i.altText || h.name })), totalCount: images.length },
    checkInTime: h.policies.checkInTime, checkOutTime: h.policies.checkOutTime, cancelPolicySummary: policy, datesText: `${h.checkIn} – ${h.checkOut}`, durationNights: Math.round((Date.parse(h.checkOut) - Date.parse(h.checkIn)) / 86400000), guestsText: `${selection.adults + selection.children} khách · ${selection.rooms} phòng`,
    resortAmenities: h.amenities.map(a => ({ icon: 'check', title: a.name, subtitle: a.description || '' })), rooms };
}
