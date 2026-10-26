import React, { useEffect, useState } from 'react';
import { Room } from '../types';
import { RoomCard } from './RoomCard';
import { roomApi, AvailableRoom, localDate } from '../../../services/roomApi';

interface RoomInventoryProps {
  rooms: Room[]; hotelId?: number; datesText?: string; durationNights?: number; guestsText?: string;
  onBookRoom?: (room: Room, packageId?: string, totalPrice?: number) => void;
  onViewRoomDetail?: (room: Room) => void;
}
export const RoomInventory: React.FC<RoomInventoryProps> = ({ hotelId, onBookRoom, onViewRoomDetail }) => {
  const [hotelInput, setHotelInput] = useState(hotelId ? String(hotelId) : '');
  const [checkIn, setCheckIn] = useState(localDate());
  const [checkOut, setCheckOut] = useState(localDate(1));
  const [guests, setGuests] = useState(1);
  const [available, setAvailable] = useState<AvailableRoom[]>([]);
  const [checked, setChecked] = useState<{ hotel: number; hotelName: string; hotelAddress: string; checkIn: string; checkOut: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setHotelInput(hotelId ? String(hotelId) : ''); setChecked(null); setAvailable([]); }, [hotelId]);
  const validSelection = checked && checked.hotel === Number(hotelInput) && checked.checkIn === checkIn && checked.checkOut === checkOut;
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
  const search = async () => {
    if (loading || pending) return;
    const hotel = Number(hotelInput); setError(''); setChecked(null); setAvailable([]);
    if (!Number.isSafeInteger(hotel) || hotel <= 0 || !checkIn || !checkOut || checkOut <= checkIn) { setError('Chọn khách sạn và khoảng ngày hợp lệ.'); return; }
    setLoading(true);
    try { const [result, info] = await Promise.all([roomApi.availability(hotel, checkIn, checkOut), roomApi.hotel(hotel)]); setAvailable(result.rooms); setChecked({ hotel, hotelName: info.hotelName, hotelAddress: info.address, checkIn, checkOut }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không kiểm tra được phòng trống.'); }
    finally { setLoading(false); }
  };
  const book = async (room: Room, packageId?: string, price?: number) => {
    if (!validSelection || pending) return; setPending(true); setError('');
    try {
      const result = await roomApi.availability(checked.hotel, checked.checkIn, checked.checkOut);
      setAvailable(result.rooms);
      if (!result.rooms.some(r => r.roomId === Number(room.id))) throw new Error('Phòng vừa được đặt hoặc khóa. Vui lòng chọn phòng khác.');
      onBookRoom?.(room, packageId, price);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xác nhận được phòng trống.'); }
    finally { setPending(false); }
  };
  const cards: Room[] = validSelection ? available.filter(r => r.capacity >= guests).map(r => ({ id: String(r.roomId), roomId: r.roomId, hotelId: r.hotelId, hotelName: checked.hotelName, hotelAddress: checked.hotelAddress, requestedGuests: guests, checkIn, checkOut,
    name: `${r.roomTypeName} · Phòng ${r.roomNumber}`, tag: 'Phòng trống', floor: `Tầng ${r.floor}`, remainingRooms: 1,
    image: '/room-placeholder.svg', specs: [{ icon: 'person', text: `${r.capacity} khách` }], features: [],
    packages: [{ id: 'base', name: 'Giá cơ bản', description: 'Giá cuối cùng được backend tính khi đặt phòng.', pricePerNight: r.price }],
    cancellationPolicy: 'Áp dụng chính sách hủy của khách sạn.',
  })) : [];
  return <section id="room-inventory" className="space-y-5 scroll-mt-28"><h2 className="text-3xl font-semibold">Kiểm tra phòng trống</h2>
    <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex flex-wrap items-end gap-3"><fieldset disabled={loading || pending} className="flex flex-wrap gap-3">
      <label>Mã khách sạn<input type="number" min="1" step="1" required value={hotelInput} onChange={e => setHotelInput(e.target.value)} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
      <label>Nhận phòng<input type="date" required min={localDate()} value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
      <label>Trả phòng<input type="date" required min={checkIn} value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
      <label>Số khách<input type="number" min="1" step="1" required value={guests} onChange={e => { const value = Number(e.target.value); if (Number.isSafeInteger(value) && value > 0) setGuests(value); }} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
    </fieldset><button disabled={loading || pending} className="rounded-full bg-primary px-5 py-3 text-on-primary disabled:opacity-50">{loading ? 'Đang kiểm tra…' : 'Tìm phòng trống'}</button></form>
    {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    {validSelection && <p className="font-semibold">{checked.hotelName} · {checked.hotelAddress}</p>}
    {pending && <p role="status">Đang xác nhận lại phòng trống…</p>}
    {validSelection && !loading && !cards.length && <p>Không còn phòng trống cho khoảng ngày này.</p>}
    {!validSelection && !loading && <p className="text-outline">Chọn khách sạn và ngày lưu trú để xem phòng còn trống.</p>}
    <div aria-busy={pending} className={pending ? 'pointer-events-none space-y-5 opacity-60' : 'space-y-5'}>{cards.map(room => <RoomCard key={`${room.id}-${checkIn}-${checkOut}`} room={room} durationNights={nights} onBookRoom={(...args) => void book(...args)} onViewRoomDetail={onViewRoomDetail} />)}</div>
  </section>;
};
export default RoomInventory;
