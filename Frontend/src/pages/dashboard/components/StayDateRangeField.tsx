import React, { useEffect, useMemo, useRef, useState } from 'react';
import { day } from '../../../services/discoveryApi';

interface StayDateRangeFieldProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

const parseDate = (value: string) => new Date(`${value}T00:00:00`);
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (value: string, count: number) => { const date = parseDate(value); date.setDate(date.getDate() + count); return isoDate(date); };
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth() + count, 1);
const formatDate = (value: string) => parseDate(value).toLocaleDateString('vi-VN');

const daysOfMonth = (month: Date) => {
  const first = monthStart(month);
  const leading = (first.getDay() + 6) % 7;
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return [...Array(leading).fill(null), ...Array.from({ length: total }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1))] as Array<Date | null>;
};

export const StayDateRangeField: React.FC<StayDateRangeFieldProps> = ({ checkIn, checkOut, onChange }) => {
  const today = day();
  const maximum = addDays(today, 180);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => monthStart(parseDate(checkIn || today)));
  const [start, setStart] = useState(checkIn || today);
  const [lastNight, setLastNight] = useState(checkOut > checkIn ? addDays(checkOut, -1) : checkIn || today);
  const [dragging, setDragging] = useState(false);
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const dragAnchor = useRef<string | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    setStart(checkIn || today);
    setLastNight(checkOut > checkIn ? addDays(checkOut, -1) : checkIn || today);
  }, [checkIn, checkOut, today]);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  const setRange = (anchor: string, target: string) => {
    const nextStart = anchor <= target ? anchor : target;
    const nextEnd = anchor <= target ? target : anchor;
    if (nextStart < today || nextEnd > maximum) return;
    setStart(nextStart);
    setLastNight(nextEnd);
  };

  const beginDrag = (event: React.PointerEvent, value: string) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    event.preventDefault();
    dragAnchor.current = value;
    suppressClick.current = true;
    setAwaitingEnd(false);
    setDragging(true);
    setRange(value, value);
  };

  const selectByClick = (value: string) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (!awaitingEnd) {
      setRange(value, value);
      setAwaitingEnd(true);
    } else {
      setRange(start, value);
      setAwaitingEnd(false);
    }
  };

  const checkOutValue = addDays(lastNight, 1);
  const nights = Math.max(1, Math.round((parseDate(lastNight).getTime() - parseDate(start).getTime()) / 86_400_000) + 1);
  const months = useMemo(() => [viewMonth, addMonths(viewMonth, 1)], [viewMonth]);
  const firstMonth = monthStart(parseDate(today));
  const finalMonth = monthStart(parseDate(maximum));

  return <div className="relative">
    <label className="block">Ngày lưu trú</label>
    <button type="button" onClick={() => setOpen(current => !current)} className="mt-1 flex w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-3 text-left">
      <span><strong className="font-medium">{formatDate(checkIn)}</strong><span className="mx-2 text-outline">–</span><strong className="font-medium">{formatDate(checkOut)}</strong></span>
      <span className="material-symbols-outlined text-[20px]">calendar_month</span>
    </button>

    {open && <div className="absolute left-0 top-full z-[70] mt-2 w-[min(760px,calc(100vw-2.5rem))] rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Chọn ngày lưu trú</h3><p className="text-xs text-outline">Kéo qua các đêm liên tiếp muốn đặt.</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container" aria-label="Đóng lịch"><span className="material-symbols-outlined text-[18px]">close</span></button></div>
      <div className="mt-3 flex items-center justify-between"><button type="button" disabled={viewMonth <= firstMonth} onClick={() => setViewMonth(current => addMonths(current, -1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container disabled:opacity-30" aria-label="Tháng trước"><span className="material-symbols-outlined">chevron_left</span></button><span className="flex items-center gap-2 text-xs text-outline"><span className="h-3 w-3 rounded bg-emerald-600" />Khoảng đang chọn</span><button type="button" disabled={addMonths(viewMonth, 1) >= finalMonth} onClick={() => setViewMonth(current => addMonths(current, 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container disabled:opacity-30" aria-label="Tháng sau"><span className="material-symbols-outlined">chevron_right</span></button></div>
      <div className="mt-3 grid gap-7 md:grid-cols-2">{months.map(month => <section key={`${month.getFullYear()}-${month.getMonth()}`}><h4 className="mb-2 text-center font-semibold capitalize">{month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h4><div className="grid grid-cols-7 gap-1 text-center text-xs text-outline">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <span key={label} className="py-1.5 font-semibold">{label}</span>)}</div><div className="grid grid-cols-7 gap-1">{daysOfMonth(month).map((date, index) => {
        if (!date) return <span key={`blank-${index}`} />;
        const value = isoDate(date);
        const disabled = value < today || value > maximum;
        const selected = value >= start && value <= lastNight;
        return <button key={value} type="button" disabled={disabled} onPointerDown={event => beginDrag(event, value)} onPointerEnter={() => { if (dragging && dragAnchor.current) setRange(dragAnchor.current, value); }} onClick={() => selectByClick(value)} className={`aspect-square rounded-xl text-sm transition ${disabled ? 'cursor-not-allowed text-outline/30' : selected ? 'bg-emerald-600 font-semibold text-white shadow-sm' : value === today ? 'border border-primary text-primary hover:bg-emerald-50' : 'hover:bg-emerald-50 hover:text-emerald-800'}`}>{date.getDate()}</button>;
      })}</div></section>)}</div>
      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-outline">Ngày đã chọn</p><p className="font-semibold">{formatDate(start)} – {formatDate(checkOutValue)} · {nights} đêm</p></div><button type="button" onClick={() => { onChange(start, checkOutValue); setOpen(false); }} className="rounded-full bg-emerald-600 px-6 py-2.5 font-semibold text-white">Áp dụng</button></div>
    </div>}
  </div>;
};

export default StayDateRangeField;
