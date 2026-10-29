import React, { useEffect, useState } from 'react';
import { HotelList } from './components/HotelList';
import { Hotel } from './types';
import { SearchCard } from '../dashboard/components/SearchCard';
import { useAuth } from '../../context/AuthContext';
import { defaultSelection, discoveryApi, DiscoveryPage, DiscoverySelection, HotelCardData, mediaUrl, toHotel } from '../../services/discoveryApi';
interface SearchPageProps { initialLocation?: string; initialDates?: string; initialGuests?: string; initialSelection?: DiscoverySelection; initialShowSaved?: boolean; onNavigateHome?: () => void; onSelectHotel?: (hotel: Hotel, selection?: DiscoverySelection) => void }
export const SearchPage: React.FC<SearchPageProps> = ({ initialSelection, initialShowSaved = false, onSelectHotel }) => {
  const { session } = useAuth();
  const [selection, setSelection] = useState(initialSelection || defaultSelection);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', roomTypeName: '', amenityId: '', sort: 'price_asc' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DiscoveryPage | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<HotelCardData[]>([]); const [showSaved, setShowSaved] = useState(false);
  useEffect(() => setShowSaved(initialShowSaved), [initialShowSaved]);
  const [amenities, setAmenities] = useState<{ amenityId: number; name: string }[]>([]);
  useEffect(() => { if (initialSelection) { setSelection(initialSelection); setPage(1); } }, [initialSelection]);
  useEffect(() => { let alive = true; discoveryApi.amenities().then(v => { if (alive) setAmenities(v); }).catch(() => {}); return () => { alive = false; }; }, []);
  useEffect(() => { let alive = true; setSaved([]); if (session) discoveryApi.wishlist().then(v => { if (alive) setSaved(v); }).catch(e => { if (alive) setNotice(e.message); }); return () => { alive = false; }; }, [session?.userId]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setResult(null);
    discoveryApi.search({ location: selection.location, checkIn: selection.checkIn, checkOut: selection.checkOut, adults: selection.adults, children: selection.children, rooms: selection.rooms, ...filters, page, pageSize: 12 }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setResult(value); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selection, filters, page, retry]);
  const favorite = async (hotelId: string, value: boolean) => {
    if (!session) { setNotice('Vui lòng đăng nhập để lưu khách sạn.'); return; }
    try { await discoveryApi.save(Number(hotelId), value); setSaved(await discoveryApi.wishlist()); setNotice(value ? 'Đã lưu khách sạn.' : 'Đã bỏ lưu khách sạn.'); } catch (e) { setNotice(e instanceof Error ? e.message : 'Không lưu được.'); }
  };
  return <main className="min-h-screen bg-background pb-12 pt-40"><SearchCard initialSelection={selection} onSearch={value => { setSelection(value); setPage(1); setShowSaved(false); }} />
    <div className="mx-auto max-w-[1440px] space-y-5 px-5 pt-8">
      <h1 className="text-3xl font-semibold">Tìm nơi lưu trú</h1><p>{selection.checkIn} – {selection.checkOut} · {selection.adults} người lớn · {selection.children} trẻ em · {selection.rooms} phòng</p>
      <div className="flex flex-wrap gap-3">{([['roomTypeName', 'Tên loại phòng'], ['minPrice', 'Giá tối thiểu'], ['maxPrice', 'Giá tối đa']] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={label} type={key === 'roomTypeName' ? 'text' : 'number'} min="0" value={filters[key]} onChange={e => { setFilters({ ...filters, [key]: e.target.value }); setPage(1); }} className="mt-1 block rounded-lg border border-outline-variant p-2" /></label>)}
        <label>Tiện ích<select value={filters.amenityId} onChange={e => { setFilters({ ...filters, amenityId: e.target.value }); setPage(1); }} className="mt-1 block rounded-lg border p-2"><option value="">Tất cả</option>{amenities.map(a => <option key={a.amenityId} value={a.amenityId}>{a.name}</option>)}</select></label>
        <label>Sắp xếp<select value={filters.sort} onChange={e => { setFilters({ ...filters, sort: e.target.value }); setPage(1); }} className="mt-1 block rounded-lg border p-2"><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="name">Tên khách sạn</option></select></label>
        <button className="self-end rounded-full bg-surface-container px-4 py-2" onClick={() => setShowSaved(!showSaved)}>{showSaved ? 'Kết quả tìm kiếm' : `Yêu thích (${saved.length})`}</button>
      </div>
      {notice && <p role="status" className="rounded-lg bg-surface-container p-3">{notice}</p>}
      {showSaved ? <section className="grid gap-4 sm:grid-cols-2">{!saved.length && <p>Chưa có khách sạn yêu thích. Đăng nhập và bấm biểu tượng trái tim để lưu.</p>}{saved.map(h => <article key={h.hotelId} className="flex gap-4 rounded-xl bg-white p-4"><img src={mediaUrl(h.imageUrl)} alt={h.name} className="h-24 w-28 rounded-lg object-cover" /><div><h2 className="font-semibold">{h.name}</h2><p>{h.city}</p><button className="mr-4 text-primary" onClick={() => onSelectHotel?.(toHotel(h, true), selection)}>Xem phòng theo ngày đã chọn</button><button onClick={() => void favorite(String(h.hotelId), false)}>Bỏ lưu</button></div></article>)}</section> : <>
        {loading && <p role="status">Đang tìm phòng trống…</p>}{error && <div role="alert" className="rounded-lg bg-error-container p-4">{error} <button onClick={() => setRetry(retry + 1)}>Thử lại</button></div>}
        {result && <><p>{result.totalCount} khách sạn phù hợp · Giá tham khảo mỗi đêm, xác nhận lại khi đặt.</p><HotelList hotels={result.items.map(h => toHotel(h, saved.some(s => s.hotelId === h.hotelId)))} currentPage={page} totalPages={result.totalPages} totalResults={result.totalCount} onPageChange={setPage} onFavoriteToggle={(id, value) => void favorite(id, value)} onSelectHotel={h => onSelectHotel?.(h, selection)} /></>}
      </>}
    </div></main>;
};
export default SearchPage;
