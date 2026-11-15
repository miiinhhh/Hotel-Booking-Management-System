import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Room } from '../types';
import { RoomCard } from './RoomCard';
import { RoomDateRangePicker } from './RoomDateRangePicker';
import { roomApi, AvailableRoom, localDate } from '../../../services/roomApi';
import { resolveRoomSelection } from '../../../services/roomSelection';

interface RoomInventoryProps {
  rooms: Room[]; hotelId?: number; datesText?: string; durationNights?: number; guestsText?: string;
  initialCheckIn?: string; initialCheckOut?: string; initialGuests?: number;
  onBookRoom?: (room: Room, packageId?: string, totalPrice?: number) => void;
  onViewRoomDetail?: (room: Room) => void;
}
export const RoomInventory: React.FC<RoomInventoryProps> = ({ hotelId, rooms, initialCheckIn, initialCheckOut, initialGuests, onBookRoom, onViewRoomDetail }) => {
  const [hotelInput, setHotelInput] = useState(hotelId ? String(hotelId) : '');
  const [checkIn, setCheckIn] = useState(initialCheckIn || localDate());
  const [checkOut, setCheckOut] = useState(initialCheckOut || localDate(1));
  const [guests, setGuests] = useState(initialGuests || 1);
  const [available, setAvailable] = useState<AvailableRoom[]>([]);
  const [checked, setChecked] = useState<{ hotel: number; hotelName: string; hotelAddress: string; checkIn: string; checkOut: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [calendarRequest, setCalendarRequest] = useState<{ room: Room; packageId?: string } | null>(null);
  const requestVersion = useRef(0);
  const confirmationVersion = useRef(0);
  const validSelection = checked && checked.hotel === Number(hotelInput) && checked.checkIn === checkIn && checked.checkOut === checkOut;
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
  const loadAvailability = useCallback(async (hotel: number, arrival: string, departure: string) => {
    const version = ++requestVersion.current;
    setError(''); setChecked(null); setAvailable([]);
    if (!Number.isSafeInteger(hotel) || hotel <= 0 || !arrival || !departure || departure <= arrival) {
      setLoading(false); setError('Chọn khách sạn và khoảng ngày hợp lệ.'); return;
    }
    setLoading(true);
    try {
      const [result, info] = await Promise.all([roomApi.availability(hotel, arrival, departure), roomApi.hotel(hotel)]);
      if (version !== requestVersion.current) return;
      setAvailable(result.rooms);
      setChecked({ hotel, hotelName: info.hotelName, hotelAddress: info.address, checkIn: arrival, checkOut: departure });
    }
    catch (reason) { if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : 'Không kiểm tra được phòng trống.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, []);
  useEffect(() => {
    requestVersion.current++;
    confirmationVersion.current++;
    const arrival = initialCheckIn || localDate();
    const departure = initialCheckOut || localDate(1);
    setHotelInput(hotelId ? String(hotelId) : '');
    setCheckIn(arrival); setCheckOut(departure); setGuests(initialGuests || 1);
    setChecked(null); setAvailable([]); setCalendarRequest(null); setError(''); setPending(false);
    if (hotelId && initialCheckIn) void loadAvailability(hotelId, arrival, departure);
    else setLoading(false);
    return () => { requestVersion.current++; confirmationVersion.current++; };
  }, [hotelId, initialCheckIn, initialCheckOut, initialGuests, loadAvailability]);
  const search = async () => {
    if (!loading && !pending) await loadAvailability(Number(hotelInput), checkIn, checkOut);
  };
  const confirmRoomDates = async (selectedCheckIn: string, selectedCheckOut: string) => {
    if (!calendarRequest || pending) return;
    const hotel = Number(calendarRequest.room.hotelId || hotelInput);
    const version = ++confirmationVersion.current;
    setPending(true);
    setError('');
    try {
      const result = await roomApi.availability(hotel, selectedCheckIn, selectedCheckOut);
      if (version !== confirmationVersion.current) return;
      const latest = result.rooms.find(room => room.roomId === Number(calendarRequest.room.id));
      const selection = resolveRoomSelection(calendarRequest.room, latest, hotel, selectedCheckIn, selectedCheckOut, guests);
      onBookRoom?.(selection.room, calendarRequest.packageId, selection.totalPrice);
      setCalendarRequest(null);
    } catch (reason) {
      if (version !== confirmationVersion.current) return;
      setChecked(null); setAvailable([]);
      const message = reason instanceof Error ? reason.message : 'Không xác nhận được phòng trống.';
      setError(message);
      throw new Error(message);
    }
    finally { if (version === confirmationVersion.current) setPending(false); }
  };
  const cards: Room[] = validSelection ? available.filter(r => r.capacity >= guests).map(r => ({ id: String(r.roomId), roomId: r.roomId, hotelId: r.hotelId, hotelName: checked.hotelName, hotelAddress: checked.hotelAddress, requestedGuests: guests, checkIn, checkOut,
    name: `${r.roomTypeName} · Phòng ${r.roomNumber}`, tag: 'Phòng trống', floor: `Tầng ${r.floor}`, remainingRooms: 1,
    image: rooms.find(room => room.roomId === r.roomId)?.image || '/room-placeholder.svg', specs: [{ icon: 'person', text: `${r.capacity} khách` }], features: rooms.find(room => room.roomId === r.roomId)?.features || [],
    packages: [{ id: 'base', name: 'Giá trung bình mỗi đêm', description: 'Đã tính giá theo ngày và phụ thu mùa vụ; tổng thanh toán được xác nhận tại checkout.', pricePerNight: r.price }],
    cancellationPolicy: rooms.find(room => room.roomId === r.roomId)?.cancellationPolicy || 'Liên hệ khách sạn để biết chính sách hủy.',
  })) : [];
  return <><section id="room-inventory" className="space-y-5 scroll-mt-28"><h2 className="text-3xl font-semibold">Kiểm tra phòng trống</h2>
    <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex flex-wrap items-end gap-3"><fieldset disabled={loading || pending} className="flex flex-wrap gap-3">
      {!hotelId && <label>Khách sạn<input type="number" min="1" step="1" required value={hotelInput} onChange={e => setHotelInput(e.target.value)} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>}
      <label>Nhận phòng<input type="date" required min={localDate()} value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
      <label>Trả phòng<input type="date" required min={checkIn} value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
      <label>Số khách<input type="number" min="1" step="1" required value={guests} onChange={e => { const value = Number(e.target.value); if (Number.isSafeInteger(value) && value > 0) setGuests(value); }} className="mt-1 block rounded-lg bg-surface-container-low p-3" /></label>
    </fieldset><button disabled={loading || pending} className="rounded-full bg-primary px-5 py-3 text-on-primary disabled:opacity-50">{loading ? 'Đang kiểm tra…' : 'Tìm phòng trống'}</button></form>
    {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    {validSelection && <p className="font-semibold">{checked.hotelName} · {checked.hotelAddress}</p>}
    {pending && <p role="status">Đang xác nhận lại phòng trống…</p>}
    {validSelection && !loading && !cards.length && <p>Không còn phòng trống cho khoảng ngày này.</p>}
    {!validSelection && !loading && <p className="text-outline">Chọn khách sạn và ngày lưu trú để xem phòng còn trống.</p>}
    <div aria-busy={pending} className={pending ? 'pointer-events-none space-y-5 opacity-60' : 'space-y-5'}>{cards.map(room => <RoomCard key={`${room.id}-${checkIn}-${checkOut}`} room={room} durationNights={nights} onBookRoom={(selectedRoom, packageId) => setCalendarRequest({ room: selectedRoom, packageId })} onViewRoomDetail={onViewRoomDetail} />)}</div>
  </section>
  {calendarRequest && <RoomDateRangePicker room={calendarRequest.room} hotelId={Number(calendarRequest.room.hotelId || hotelInput)} initialCheckIn={calendarRequest.room.checkIn} initialCheckOut={calendarRequest.room.checkOut} onClose={() => { confirmationVersion.current++; setPending(false); setCalendarRequest(null); }} onConfirm={confirmRoomDates} />}</>;
};
export default RoomInventory;
