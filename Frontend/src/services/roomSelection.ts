import type { AvailableRoom } from './roomApi';
import type { Room } from '../pages/hotel-detail/types';

// Rebuild the checkout selection from the latest dated availability, not from a stale card.
export function resolveRoomSelection(room: Room, latestRooms: AvailableRoom[], hotelId: number,
  checkIn: string, checkOut: string, guests: number) {
  const sameType = (r: AvailableRoom) => (room.roomTypeId ? r.roomTypeId === room.roomTypeId : r.roomTypeName === (room.typeName ?? room.name));
  const latest = latestRooms.find(r => r.roomId === Number(room.id) && r.capacity >= guests)
    ?? latestRooms.find(r => r.hotelId === hotelId && sameType(r) && r.capacity >= guests);
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 90)
    throw new Error('Chọn khoảng lưu trú từ 1 đến 90 đêm.');
  if (!latest || latest.hotelId !== hotelId)
    throw new Error('Hạng phòng này đã hết phòng trống trong khoảng ngày đã chọn. Vui lòng chọn ngày khác.');
  if (!Number.isInteger(guests) || guests < 1 || latest.capacity < guests)
    throw new Error('Sức chứa phòng đã thay đổi hoặc không đủ cho số khách đã chọn.');
  const selected: Room = { ...room, id: String(latest.roomId), roomId: latest.roomId, roomTypeId: latest.roomTypeId, checkIn, checkOut, requestedGuests: guests,
    name: latest.roomTypeName,
    floor: '',
    specs: [{ icon: 'person', text: `${latest.capacity} khách` }],
    packages: room.packages?.map(item => ({ ...item, pricePerNight: latest.price })),
    allInclusiveDetail: room.allInclusiveDetail ? { ...room.allInclusiveDetail, pricePerNight: latest.price } : undefined };
  return { room: selected, totalPrice: latest.price * nights };
}
