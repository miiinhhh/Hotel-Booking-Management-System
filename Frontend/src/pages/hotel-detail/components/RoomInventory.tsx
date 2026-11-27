import { discoveryApi, defaultSelection, mediaUrl } from '../../../services/discoveryApi';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Room } from '../types';
import { RoomCard } from './RoomCard';
import { RoomDateRangePicker } from './RoomDateRangePicker';
import { roomApi, AvailableRoom, localDate } from '../../../services/roomApi';
import { resolveRoomSelection } from '../../../services/roomSelection';
import { useLanguage } from '../../../i18n/LanguageContext';

interface RoomInventoryProps {
  rooms: Room[]; hotelId?: number; datesText?: string; durationNights?: number; guestsText?: string;
  initialCheckIn?: string; initialCheckOut?: string; initialGuests?: number;
  onBookRoom?: (room: Room, packageId?: string, totalPrice?: number) => void;
  onViewRoomDetail?: (room: Room) => void;
}
export const RoomInventory: React.FC<RoomInventoryProps> = ({ hotelId, rooms, initialCheckIn, initialCheckOut, initialGuests, onBookRoom, onViewRoomDetail }) => {
  const { t } = useLanguage();
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
  /** Ảnh, tiện ích, chính sách theo HẠNG phòng cho đúng khoảng ngày đang tìm (không phụ thuộc danh sách lúc mở trang). */
  const [typeInfo, setTypeInfo] = useState<Map<number, { image: string; features: Room['features']; policy: string | null }>>(new Map());
  const validSelection = checked && checked.hotel === Number(hotelInput) && checked.checkIn === checkIn && checked.checkOut === checkOut;
  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
  const loadAvailability = useCallback(async (hotel: number, arrival: string, departure: string) => {
    const version = ++requestVersion.current;
    setError(''); setChecked(null); setAvailable([]);
    if (!Number.isSafeInteger(hotel) || hotel <= 0 || !arrival || !departure || departure <= arrival) {
      setLoading(false); setError(t('rooms.invalidRange')); return;
    }
    setLoading(true);
    try {
      const [result, info, detail] = await Promise.all([roomApi.availability(hotel, arrival, departure), roomApi.hotel(hotel),
        discoveryApi.detail(hotel, { ...defaultSelection(), checkIn: arrival, checkOut: departure }).catch(() => null)]);
      if (version !== requestVersion.current) return;
      setAvailable(result.rooms);
      const map = new Map<number, { image: string; features: Room['features']; policy: string | null }>();
      for (const r of detail?.rooms ?? []) {
        if (r.roomTypeId == null) continue;
        const current = map.get(r.roomTypeId);
        const uploaded = Boolean(r.imageUrl?.startsWith('/api/'));
        // Ưu tiên ảnh do khách sạn tự tải lên (/api/...) hơn ảnh mẫu.
        if (!current || (uploaded && !current.image.includes('/api/')))
          map.set(r.roomTypeId, { image: mediaUrl(r.imageUrl), features: r.amenities.map(a => ({ icon: 'check', text: a.name })), policy: detail?.policies.cancellationPolicy ?? null });
      }
      setTypeInfo(map);
      setChecked({ hotel, hotelName: info.hotelName, hotelAddress: info.address, checkIn: arrival, checkOut: departure });
    }
    catch (reason) { if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : t('rooms.loadFailed')); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [t]);
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
      const selection = resolveRoomSelection(calendarRequest.room, result.rooms, hotel, selectedCheckIn, selectedCheckOut, guests);
      onBookRoom?.(selection.room, calendarRequest.packageId, selection.totalPrice);
      setCalendarRequest(null);
    } catch (reason) {
      if (version !== confirmationVersion.current) return;
      setChecked(null); setAvailable([]);
      const message = reason instanceof Error ? reason.message : t('rooms.confirmFailed');
      setError(message);
      throw new Error(message);
    }
    finally { if (version === confirmationVersion.current) setPending(false); }
  };
  // Khách đặt theo HẠNG phòng: gộp các phòng trống cùng hạng thành một thẻ, không hiện số phòng/tầng.
  const byType = new Map<number, AvailableRoom[]>();
  if (validSelection) for (const r of available) byType.set(r.roomTypeId, [...(byType.get(r.roomTypeId) ?? []), r]);
  const cards: Room[] = Array.from(byType.values()).filter(group => group.slice(0, 5).reduce((s, x) => s + x.capacity, 0) >= guests).map(group => {
    const r = [...group].sort((a, b) => a.price - b.price)[0];
    const fresh = typeInfo.get(r.roomTypeId);
    const info = rooms.find(room => room.roomTypeId === r.roomTypeId || room.typeName === r.roomTypeName || room.roomId === r.roomId);
    return { id: String(r.roomId), roomId: r.roomId, roomTypeId: r.roomTypeId, typeName: r.roomTypeName, hotelId: r.hotelId, hotelName: checked!.hotelName, hotelAddress: checked!.hotelAddress, requestedGuests: guests, checkIn, checkOut,
      name: r.roomTypeName, tag: t('rooms.left', { count: group.length }), floor: '', remainingRooms: group.length,
      image: fresh?.image || info?.image || '/room-placeholder.svg',
      specs: [{ icon: 'person', text: t('rooms.capacity', { count: r.capacity }) }, { icon: 'meeting_room', text: t('rooms.left', { count: group.length }) }],
      features: fresh?.features.length ? fresh.features : info?.features || [],
      packages: [{ id: 'base', name: t('rooms.avgPrice'), description: t('rooms.avgPriceNote'), pricePerNight: r.price }],
      cancellationPolicy: fresh?.policy || info?.cancellationPolicy || t('rooms.policyFallback'),
    };
  });
  const field = 'mt-1.5 block h-11 w-full rounded-full border border-outline-variant/60 bg-surface-container-lowest px-4 text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
  const label = 'text-xs font-semibold uppercase tracking-wider text-on-surface-variant';
  return <><section id="room-inventory" aria-labelledby="rooms-title" className="space-y-4">
    <div>
      <h2 id="rooms-title" className="text-2xl font-semibold text-on-surface">{t('rooms.title')}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{t('rooms.subtitle')}</p>
    </div>
    <form onSubmit={e => { e.preventDefault(); void search(); }} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
      <fieldset disabled={loading || pending} className={`grid gap-3 sm:grid-cols-2 ${hotelId ? 'lg:grid-cols-[1fr_1fr_120px_auto]' : 'lg:grid-cols-[120px_1fr_1fr_120px_auto]'} lg:items-end`}>
        {!hotelId && <label className={label}>{t('rooms.hotel')}<input type="number" min="1" step="1" required value={hotelInput} onChange={e => setHotelInput(e.target.value)} className={field} /></label>}
        <label className={label}>{t('detail.checkIn')}<input type="date" required min={localDate()} value={checkIn} onChange={e => setCheckIn(e.target.value)} className={field} /></label>
        <label className={label}>{t('detail.checkOut')}<input type="date" required min={checkIn} value={checkOut} onChange={e => setCheckOut(e.target.value)} className={field} /></label>
        <label className={label}>{t('rooms.guests')}<input type="number" min="1" step="1" required value={guests} onChange={e => { const value = Number(e.target.value); if (Number.isSafeInteger(value) && value > 0) setGuests(value); }} className={field} /></label>
        <button disabled={loading || pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary disabled:opacity-50">
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'search'}</span>{loading ? t('rooms.checking') : t('rooms.find')}
        </button>
      </fieldset>
    </form>
    {error && <p role="alert" className="rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}
    {pending && <p role="status" className="text-sm text-on-surface-variant">{t('rooms.reconfirming')}</p>}
    {validSelection && !loading && !cards.length && <p className="rounded-2xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">{t('rooms.none')}</p>}
    {!validSelection && !loading && !error && <p className="text-sm text-on-surface-variant">{t('rooms.prompt')}</p>}
    {loading && <div className="space-y-4" aria-hidden="true">{[0, 1].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-container" />)}</div>}
    <div aria-busy={pending} className={pending ? 'pointer-events-none space-y-4 opacity-60' : 'space-y-4'}>{cards.map(room => <RoomCard key={`${room.id}-${checkIn}-${checkOut}`} room={room} durationNights={nights} onBookRoom={(selectedRoom, packageId) => setCalendarRequest({ room: selectedRoom, packageId })} onViewRoomDetail={onViewRoomDetail} />)}</div>
  </section>
  {calendarRequest && <RoomDateRangePicker room={calendarRequest.room} hotelId={Number(calendarRequest.room.hotelId || hotelInput)} initialCheckIn={calendarRequest.room.checkIn} initialCheckOut={calendarRequest.room.checkOut} onClose={() => { confirmationVersion.current++; setPending(false); setCalendarRequest(null); }} onConfirm={confirmRoomDates} />}</>;
};
export default RoomInventory;
