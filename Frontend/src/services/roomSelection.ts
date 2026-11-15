import type { AvailableRoom } from './roomApi';
import type { Room } from '../pages/hotel-detail/types';

// Rebuild the checkout selection from the latest dated availability, not from a stale card.
export function resolveRoomSelection(room: Room, latest: AvailableRoom | undefined, hotelId: number,
  checkIn: string, checkOut: string, guests: number) {
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 90)
    throw new Error('Chọn khoảng lưu trú từ 1 đến 90 đêm.');
  if (!latest || latest.roomId !== Number(room.id) || latest.hotelId !== hotelId)
    throw new Error('Phòng vừa được đặt hoặc khóa bán. Vui lòng chọn khoảng ngày khác.');
  if (!Number.isInteger(guests) || guests < 1 || latest.capacity < guests)
    throw new Error('Sức chứa phòng đã thay đổi hoặc không đủ cho số khách đã chọn.');
  const selected: Room = { ...room, checkIn, checkOut, requestedGuests: guests,
    name: `${latest.roomTypeName} · Phòng ${latest.roomNumber}`,
    floor: `Tầng ${latest.floor}`,
    specs: [{ icon: 'person', text: `${latest.capacity} khách` }],
    packages: room.packages?.map(item => ({ ...item, pricePerNight: latest.price })),
    allInclusiveDetail: room.allInclusiveDetail ? { ...room.allInclusiveDetail, pricePerNight: latest.price } : undefined };
  return { room: selected, totalPrice: latest.price * nights };
}
