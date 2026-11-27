import type { AvailableRoom } from './roomApi';
import type { Room } from '../pages/hotel-detail/types';

// Rebuild the checkout selection from the latest dated availability, not from a stale card.
export function resolveRoomSelection(room: Room, latestRooms: AvailableRoom[], hotelId: number,
  checkIn: string, checkOut: string, guests: number) {
  const sameType = (r: AvailableRoom) => (room.roomTypeId ? r.roomTypeId === room.roomTypeId : r.roomTypeName === (room.typeName ?? room.name));
  const quantity = Math.max(1, room.quantity ?? 1);
  // Phòng trống cùng hạng; ưu tiên phòng đã xếp tạm trên thẻ, rồi theo giá thấp.
  const pool = latestRooms.filter(r => r.hotelId === hotelId && (r.roomId === Number(room.id) || sameType(r)))
    .sort((a, b) => (a.roomId === Number(room.id) ? -1 : b.roomId === Number(room.id) ? 1 : a.price - b.price));
  const picked = pool.slice(0, quantity);
  if (picked.length < quantity)
    throw new Error(`Hạng phòng này chỉ còn ${picked.length} phòng trống trong khoảng ngày đã chọn.`);
  const latest = picked[0];
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 90)
    throw new Error('Chọn khoảng lưu trú từ 1 đến 90 đêm.');
  if (!latest || latest.hotelId !== hotelId)
    throw new Error('Hạng phòng này đã hết phòng trống trong khoảng ngày đã chọn. Vui lòng chọn ngày khác.');
  const capacity = picked.reduce((sum, r) => sum + r.capacity, 0);
  if (!Number.isInteger(guests) || guests < 1 || capacity < guests)
    throw new Error(quantity > 1 ? `${quantity} phòng chứa tối đa ${capacity} khách, chưa đủ cho ${guests} khách. Hãy chọn thêm phòng.` : 'Sức chứa phòng không đủ cho số khách đã chọn. Hãy chọn thêm phòng.');
  const totalPerNight = picked.reduce((sum, r) => sum + r.price, 0);
  const selected: Room = { ...room, id: String(latest.roomId), roomId: latest.roomId, roomIds: picked.map(r => r.roomId), quantity, roomTypeId: latest.roomTypeId, checkIn, checkOut, requestedGuests: guests,
    name: quantity > 1 ? `${quantity} × ${latest.roomTypeName}` : latest.roomTypeName,
    floor: '',
    specs: [{ icon: 'person', text: `${latest.capacity} khách` }],
    packages: room.packages?.map(item => ({ ...item, pricePerNight: latest.price })),
    allInclusiveDetail: room.allInclusiveDetail ? { ...room.allInclusiveDetail, pricePerNight: latest.price } : undefined };
  return { room: selected, totalPrice: totalPerNight * nights };
}
