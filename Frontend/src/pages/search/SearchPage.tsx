import React, { useEffect, useState } from 'react';
import { HotelList } from './components/HotelList';
import { Hotel } from './types';
import { SearchCard } from '../dashboard/components/SearchCard';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, formatMoney } from '../../i18n/LanguageContext';
import { SELF_PERMISSIONS } from '../../auth/permissions';
import { loadHotelRatings } from '../../services/reviewApi';
import type { RatingSummary } from '../../services/discoveryApi';
import { defaultSelection, discoveryApi, DiscoveryPage, DiscoverySelection, HotelCardData, mediaUrl, toHotel } from '../../services/discoveryApi';
interface SearchPageProps { initialLocation?: string; initialDates?: string; initialGuests?: string; initialSelection?: DiscoverySelection; initialShowSaved?: boolean; onNavigateHome?: () => void; onSelectHotel?: (hotel: Hotel, selection?: DiscoverySelection) => void }
export const SearchPage: React.FC<SearchPageProps> = ({ initialSelection, initialShowSaved = false, onSelectHotel }) => {
  const { session, hasPermission } = useAuth();
  const { t, locale } = useLanguage();
  // Khách chưa đăng nhập vẫn thấy trái tim (bấm sẽ được nhắc đăng nhập); tài khoản bị tắt quyền thì ẩn hẳn.
  const canUseWishlist = !session || hasPermission(SELF_PERMISSIONS.wishlistManage);
  const [selection, setSelection] = useState<DiscoverySelection>(() => ({ ...(initialSelection || defaultSelection()), location: '' }));
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', roomTypeName: '', amenityId: '', sort: 'price_asc' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DiscoveryPage | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<HotelCardData[]>([]); const [showSaved, setShowSaved] = useState(false);
  useEffect(() => setShowSaved(initialShowSaved), [initialShowSaved]);
  // Điểm đánh giá thật cho các khách sạn đang hiển thị
  const [ratings, setRatings] = useState<Record<number, RatingSummary>>({});
  useEffect(() => {
    const ids = [...(result?.items || []), ...saved].map(h => h.hotelId);
    if (!ids.length) return;
    let alive = true;
    loadHotelRatings(ids).then(value => { if (alive) setRatings(prev => ({ ...prev, ...value })); });
    return () => { alive = false; };
  }, [result, saved]);
  const [amenities, setAmenities] = useState<{ amenityId: number; name: string }[]>([]);
  useEffect(() => { if (initialSelection) { setSelection({ ...initialSelection, location: '' }); setPage(1); } }, [initialSelection]);
  useEffect(() => { let alive = true; discoveryApi.amenities().then(v => { if (alive) setAmenities(v); }).catch(() => {}); return () => { alive = false; }; }, []);
  useEffect(() => { let alive = true; setSaved([]); if (session && canUseWishlist) discoveryApi.wishlist().then(v => { if (alive) setSaved(v); }).catch(e => { if (alive) setNotice(e.message); }); return () => { alive = false; }; }, [session?.userId, canUseWishlist]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setResult(null);
    discoveryApi.search({ location: selection.location, checkIn: selection.checkIn, checkOut: selection.checkOut, adults: selection.adults, children: selection.children, rooms: selection.rooms, ...filters, page, pageSize: 12 }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setResult(value); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selection, filters, page, retry]);
  const favorite = async (hotelId: string, value: boolean) => {
    if (!session) { setNotice(t('search.loginToSave')); return; }
    try { await discoveryApi.save(Number(hotelId), value); setSaved(await discoveryApi.wishlist()); setNotice(value ? t('search.saved') : t('search.unsaved')); } catch (e) { setNotice(e instanceof Error ? e.message : t('search.saveFailed')); }
  };
  return <main className="min-h-screen bg-background pb-12 pt-40"><SearchCard initialSelection={selection} onSearch={value => { setSelection(value); setPage(1); setShowSaved(false); }} />
    <div className="mx-auto max-w-[1440px] space-y-5 px-5 pt-8">
      <h1 className="text-3xl font-semibold">{t('search.pageTitle')}</h1><p>{t('search.criteria', { checkIn: selection.checkIn, checkOut: selection.checkOut, adults: selection.adults, children: selection.children, rooms: selection.rooms })}</p>
      <div className="flex flex-wrap gap-3">{([['roomTypeName', t('search.filterRoomType')], ['minPrice', t('search.filterMinPrice')], ['maxPrice', t('search.filterMaxPrice')]] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={label} type={key === 'roomTypeName' ? 'text' : 'number'} min="0" value={filters[key]} onChange={e => { setFilters({ ...filters, [key]: e.target.value }); setPage(1); }} className="mt-1 block rounded-lg border border-outline-variant p-2" /></label>)}
        <label>{t('search.filterAmenity')}<select value={filters.amenityId} onChange={e => { setFilters({ ...filters, amenityId: e.target.value }); setPage(1); }} className="mt-1 block rounded-lg border p-2"><option value="">{t('search.all')}</option>{amenities.map(a => <option key={a.amenityId} value={a.amenityId}>{a.name}</option>)}</select></label>
        <label>{t('search.sort')}<select value={filters.sort} onChange={e => { setFilters({ ...filters, sort: e.target.value }); setPage(1); }} className="mt-1 block rounded-lg border p-2"><option value="price_asc">{t('search.sortPriceAsc')}</option><option value="price_desc">{t('search.sortPriceDesc')}</option><option value="name">{t('search.sortName')}</option></select></label>
        {canUseWishlist && <button type="button" aria-pressed={showSaved} className={`flex items-center gap-1.5 self-end rounded-full px-4 py-2 font-label-md text-label-md font-semibold transition-colors ${showSaved ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface hover:text-primary'}`} onClick={() => setShowSaved(!showSaved)}><span className="material-symbols-outlined text-[18px]" style={showSaved ? undefined : { fontVariationSettings: "'FILL' 1" }}>{showSaved ? 'search' : 'favorite'}</span>{showSaved ? t('search.results') : t('search.favoritesCount', { count: saved.length })}</button>}
      </div>
      {notice && <p role="status" className="rounded-lg bg-surface-container p-3">{notice}</p>}
      {showSaved && canUseWishlist ? <section aria-label={t('search.savedHotels')} className="space-y-4">
        <div className="flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span><h2 className="font-headline-sm text-headline-sm">{t('search.savedHotels')}</h2><span className="rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">{saved.length}</span></div>
        {!saved.length ? <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary"><span className="material-symbols-outlined text-[28px]">favorite</span></span>
          <p className="font-body-md text-body-md font-medium text-on-surface">{t('search.savedEmpty')}</p>
          <p className="max-w-md font-label-md text-label-md text-on-surface-variant">{session ? t('search.savedEmptyHint') : t('search.savedEmptyGuest')}</p>
          <button type="button" onClick={() => setShowSaved(false)} className="mt-1 rounded-full bg-primary-container px-space-lg py-2.5 font-label-lg text-label-lg font-semibold text-on-primary shadow-sm transition-all hover:bg-tertiary-container active:scale-95">{t('search.exploreHotels')}</button>
        </div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{saved.map(h => <article key={h.hotelId} onClick={() => onSelectHotel?.(toHotel(h, true, ratings[h.hotelId]), selection)} className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-transparent bg-surface-container-lowest transition-all hover:border-surface-container hover:shadow-[0_12px_32px_-4px_rgba(120,53,15,0.08)]">
          <div className="relative h-48 overflow-hidden">
            <img src={mediaUrl(h.imageUrl)} alt={h.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <button type="button" aria-label={t('search.unsaveHotel', { name: h.name })} title={t('search.unsave')} onClick={e => { e.stopPropagation(); void favorite(String(h.hotelId), false); }} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/90 text-primary shadow-sm backdrop-blur-md transition-colors hover:bg-surface-container-lowest"><span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span></button>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-center gap-1 text-on-surface-variant"><span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span><span className="truncate font-label-md text-label-md">{[h.address, h.city].filter(Boolean).join(', ')}</span></div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary">{h.name}</h3>
            {h.roomTypeName && <span className="font-label-sm text-label-sm text-on-surface-variant">{h.roomTypeName}</span>}
            <div className="mt-auto flex items-end justify-between gap-3 border-t border-surface-container/60 pt-3">
              {h.pricePerNight > 0 ? <div className="flex flex-col"><span className="font-body-md text-body-md font-bold text-on-surface">{formatMoney(h.pricePerNight, locale)}</span><span className="font-label-sm text-label-sm text-outline-variant">{t('search.perNightIndicative')}</span></div> : <span />}
              <button type="button" onClick={e => { e.stopPropagation(); onSelectHotel?.(toHotel(h, true, ratings[h.hotelId]), selection); }} className="flex shrink-0 items-center gap-space-xs rounded-full bg-primary-container px-4 py-2 font-label-lg text-label-lg font-semibold text-on-primary shadow-sm transition-all hover:bg-tertiary-container active:scale-95"><span>{t('search.viewRooms')}</span><span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
            </div>
          </div>
        </article>)}</div>}
      </section> : <>
        {loading && <p role="status">{t('search.loading')}</p>}{error && <div role="alert" className="rounded-lg bg-error-container p-4">{error} <button onClick={() => setRetry(retry + 1)}>{t('search.retry')}</button></div>}
        {result && <><p>{t('search.resultCount', { count: result.totalCount })}</p><HotelList hotels={result.items.map(h => toHotel(h, saved.some(s => s.hotelId === h.hotelId), ratings[h.hotelId]))} currentPage={page} totalPages={result.totalPages} totalResults={result.totalCount} onPageChange={setPage} onFavoriteToggle={canUseWishlist ? (id, value) => void favorite(id, value) : undefined} onSelectHotel={h => onSelectHotel?.(h, selection)} /></>}
      </>}
    </div></main>;
};
export default SearchPage;
