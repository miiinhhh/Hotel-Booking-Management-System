import React, { useEffect, useMemo, useRef, useState } from 'react';
import { localDate, roomApi } from '../../../services/roomApi';
import { Room } from '../types';

interface RoomDateRangePickerProps {
  room: Room;
  hotelId: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string) => Promise<void>;
}

const parseDate = (value: string) => new Date(`${value}T00:00:00`);
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (value: string, days: number) => { const date = parseDate(value); date.setDate(date.getDate() + days); return isoDate(date); };
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth() + count, 1);
const formatShort = (value: string) => parseDate(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const monthDays = (month: Date) => {
  const first = monthStart(month);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1))] as Array<Date | null>;
};

export const RoomDateRangePicker: React.FC<RoomDateRangePickerProps> = ({
  room, hotelId, initialCheckIn, initialCheckOut, onClose, onConfirm,
}) => {
  const today = localDate();
  const calendarEnd = addDays(today, 180);
  const initialLastNight = initialCheckOut && initialCheckIn && initialCheckOut > initialCheckIn ? addDays(initialCheckOut, -1) : initialCheckIn || today;
  const [viewMonth, setViewMonth] = useState(() => monthStart(parseDate(initialCheckIn || today)));
  const [rangeStart, setRangeStart] = useState(initialCheckIn || today);
  const [rangeEnd, setRangeEnd] = useState(initialLastNight);
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const dragAnchor = useRef<string | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    roomApi.calendar(hotelId, Number(room.id), today, calendarEnd)
      .then(result => { if (active) setUnavailable(new Set(result.unavailableDates)); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được lịch phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [calendarEnd, hotelId, room.id, today]);

  useEffect(() => {
    const stopDragging = () => setDragging(false);
    window.addEventListener('pointerup', stopDragging);
    return () => window.removeEventListener('pointerup', stopDragging);
  }, []);

  const rangeIsAvailable = (start: string, end: string) => {
    for (let day = start; day <= end; day = addDays(day, 1)) {
      if (day < today || day > calendarEnd || unavailable.has(day)) return false;
    }
    return true;
  };

  const setCandidateRange = (anchor: string, target: string) => {
    const start = anchor <= target ? anchor : target;
    const end = anchor <= target ? target : anchor;
    if (!rangeIsAvailable(start, end)) {
      setError('Khoảng đang chọn có ngày phòng đã được đặt hoặc khóa bán.');
      return;
    }
    setError('');
    setRangeStart(start);
    setRangeEnd(end);
  };

  const beginDrag = (event: React.PointerEvent, day: string) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    event.preventDefault();
    dragAnchor.current = day;
    suppressClick.current = true;
    setAwaitingEnd(false);
    setDragging(true);
    setCandidateRange(day, day);
  };

  const extendDrag = (day: string) => {
    if (dragging && dragAnchor.current) setCandidateRange(dragAnchor.current, day);
  };

  const selectByClick = (day: string) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (!awaitingEnd) {
      setCandidateRange(day, day);
      setAwaitingEnd(true);
      return;
    }
    setCandidateRange(rangeStart, day);
    setAwaitingEnd(false);
  };

  const nights = Math.max(1, Math.round((parseDate(rangeEnd).getTime() - parseDate(rangeStart).getTime()) / 86_400_000) + 1);
  const checkOut = addDays(rangeEnd, 1);
  const visibleMonths = useMemo(() => [viewMonth, addMonths(viewMonth, 1)], [viewMonth]);
  const firstMonth = monthStart(parseDate(today));
  const lastMonth = monthStart(parseDate(calendarEnd));

  const confirm = async () => {
    if (!rangeIsAvailable(rangeStart, rangeEnd)) return;
    setSubmitting(true);
    setError('');
    try { await onConfirm(rangeStart, checkOut); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể xác nhận khoảng ngày đã chọn.'); }
    finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Chọn ngày đặt ${room.name}`}>
    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-surface-container-lowest p-5 shadow-2xl md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">Chọn ngày lưu trú</p><h2 className="mt-1 text-2xl font-semibold text-on-surface">{room.name}</h2><p className="mt-1 text-sm text-outline">Kéo qua các đêm liên tiếp muốn đặt. Ngày màu xám đã hết phòng.</p></div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container" aria-label="Đóng lịch"><span className="material-symbols-outlined">close</span></button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button type="button" disabled={viewMonth <= firstMonth} onClick={() => setViewMonth(current => addMonths(current, -1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container disabled:opacity-30" aria-label="Tháng trước"><span className="material-symbols-outlined">chevron_left</span></button>
        <div className="flex items-center gap-4 text-xs text-outline"><span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-600" />Đang chọn</span><span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-surface-container-high" />Không thể chọn</span></div>
        <button type="button" disabled={addMonths(viewMonth, 1) >= lastMonth} onClick={() => setViewMonth(current => addMonths(current, 1))} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container disabled:opacity-30" aria-label="Tháng sau"><span className="material-symbols-outlined">chevron_right</span></button>
      </div>

      {loading ? <div className="flex min-h-64 items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div> : <div className="mt-4 grid gap-8 md:grid-cols-2">
        {visibleMonths.map(month => <section key={`${month.getFullYear()}-${month.getMonth()}`}>
          <h3 className="mb-3 text-center font-semibold capitalize">{month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-outline">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <span key={day} className="py-2 font-semibold">{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">{monthDays(month).map((date, index) => {
            if (!date) return <span key={`blank-${index}`} />;
            const value = isoDate(date);
            const disabled = value < today || value > calendarEnd || unavailable.has(value);
            const selected = value >= rangeStart && value <= rangeEnd;
            return <button key={value} type="button" disabled={disabled} onPointerDown={event => beginDrag(event, value)} onPointerEnter={() => extendDrag(value)} onClick={() => selectByClick(value)} className={`aspect-square rounded-xl text-sm transition ${disabled ? 'cursor-not-allowed bg-surface-container text-outline/40 line-through' : selected ? 'bg-emerald-600 font-semibold text-white shadow-sm' : value === today ? 'border border-primary text-primary hover:bg-emerald-50' : 'hover:bg-emerald-50 hover:text-emerald-800'}`} aria-label={`${disabled ? 'Không thể chọn' : 'Chọn'} ngày ${formatShort(value)}`}>{date.getDate()}</button>;
          })}</div>
        </section>)}
      </div>}

      {error && <p role="alert" className="mt-4 rounded-xl bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-outline">Kỳ lưu trú đã chọn</p><p className="font-semibold text-on-surface">{formatShort(rangeStart)} – {formatShort(checkOut)} · {nights} đêm</p></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-full bg-surface-container px-5 py-3 font-semibold">Hủy</button><button type="button" disabled={loading || submitting} onClick={() => void confirm()} className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Đang kiểm tra…' : 'Xác nhận ngày'}</button></div>
      </div>
    </div>
  </div>;
};

export default RoomDateRangePicker;
