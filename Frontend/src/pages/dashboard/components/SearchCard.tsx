import React, { useState, useEffect } from 'react';
import { defaultSelection, DiscoverySelection, day } from '../../../services/discoveryApi';
interface SearchCardProps { initialSelection?: DiscoverySelection; onSearch?: (selection: DiscoverySelection) => void }
export const SearchCard: React.FC<SearchCardProps> = ({ onSearch, initialSelection }) => {
  const [selection, setSelection] = useState(initialSelection || defaultSelection);
  useEffect(() => { if (initialSelection) setSelection(initialSelection); }, [initialSelection]);
  const field = 'mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-low p-3';
  return <section className="relative z-20 mx-auto -mt-12 w-full max-w-[1440px] px-5"><form onSubmit={e => { e.preventDefault(); onSearch?.({ ...selection, dates: `${selection.checkIn} – ${selection.checkOut}`, guests: `${selection.adults + selection.children} khách · ${selection.rooms} phòng` }); }} className="grid gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-lg sm:grid-cols-2 lg:grid-cols-7">
    <label className="lg:col-span-2">Khu vực<input className={field} value={selection.location} placeholder="Thành phố, địa chỉ hoặc khách sạn" maxLength={100} onChange={e => setSelection({ ...selection, location: e.target.value })} /></label>
    <label>Nhận phòng<input className={field} type="date" required min={day()} value={selection.checkIn} onChange={e => setSelection({ ...selection, checkIn: e.target.value })} /></label>
    <label>Trả phòng<input className={field} type="date" required min={selection.checkIn} value={selection.checkOut} onChange={e => setSelection({ ...selection, checkOut: e.target.value })} /></label>
    <div className="grid grid-cols-3 gap-2 lg:col-span-2">{([['adults', 'Người lớn', 1, 100], ['children', 'Trẻ em', 0, 100], ['rooms', 'Phòng', 1, 20]] as const).map(([key, label, min, max]) => <label key={key}>{label}<input type="number" required min={min} max={max} className={field} value={selection[key]} onChange={e => setSelection({ ...selection, [key]: Number(e.target.value) })} /></label>)}</div>
    <button className="self-end rounded-full bg-primary px-5 py-3 font-semibold text-on-primary">Tìm kiếm</button>
  </form></section>;
};
export default SearchCard;
