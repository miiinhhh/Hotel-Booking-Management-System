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

const EMPTY_FILTERS = { minPrice: '', maxPrice: '', roomTypeName: '', amenityId: '', sort: 'price_asc' };
type Filters = typeof EMPTY_FILTERS;

/**
 * Kết quả tìm kiếm: ô tìm kiếm phía trên, bộ lọc ở cột trái (nhiều tiêu chí → sidebar),
 * số kết quả + sắp xếp + chip bộ lọc đang áp dụng (gỡ từng cái) ở đầu danh sách.
 */
export const SearchPage: React.FC<SearchPageProps> = ({ initialSelection, initialShowSaved = false, onSelectHotel }) => {
  const { session, hasPermission } = useAuth();
  const { t, locale } = useLanguage();
  // Khách chưa đăng nhập vẫn thấy trái tim (bấm sẽ được nhắc đăng nhập); tài khoản bị tắt quyền thì ẩn hẳn.
  const canUseWishlist = !session || hasPermission(SELF_PERMISSIONS.wishlistManage);
  const [selection, setSelection] = useState<DiscoverySelection>(() => ({ ...(initialSelection || defaultSelection()), location: '' }));
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DiscoveryPage | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<HotelCardData[]>([]); const [showSaved, setShowSaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const setFilter = (key: keyof Filters, value: string) => { setFilters(f => ({ ...f, [key]: value })); setPage(1); };

  // Chip các bộ lọc đang áp dụng
  const amenityName = amenities.find(a => String(a.amenityId) === filters.amenityId)?.name;
  const chips: { key: keyof Filters; label: string }[] = [
    ...(filters.roomTypeName ? [{ key: 'roomTypeName' as const, label: t('search.chipRoomType', { value: filters.roomTypeName }) }] : []),
    ...(filters.minPrice ? [{ key: 'minPrice' as const, label: t('search.chipMin', { value: formatMoney(Number(filters.minPrice), locale) }) }] : []),
    ...(filters.maxPrice ? [{ key: 'maxPrice' as const, label: t('search.chipMax', { value: formatMoney(Number(filters.maxPrice), locale) }) }] : []),
    ...(filters.amenityId && amenityName ? [{ key: 'amenityId' as const, label: amenityName }] : []),
  ];

  const input = 'mt-1.5 h-10 w-full rounded-full border border-outline-variant/60 bg-surface-container-lowest px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
  const label = 'block text-xs font-semibold uppercase tracking-wider text-on-surface-variant';

  const filterPanel = (
    <div className="space-y-6">
      <label className={label}>{t('search.filterRoomType')}
        <input type="text" value={filters.roomTypeName} placeholder={t('search.roomTypePh')} onChange={e => setFilter('roomTypeName', e.target.value)} className={`${input} font-normal normal-case tracking-normal`} />
      </label>
      <div>
        <p className={label}>{t('search.priceRange')}</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <input type="number" min="0" step="100000" aria-label={t('search.filterMinPrice')} placeholder={t('search.from')} value={filters.minPrice} onChange={e => setFilter('minPrice', e.target.value)} className={input.replace('mt-1.5 ', '')} />
          <input type="number" min="0" step="100000" aria-label={t('search.filterMaxPrice')} placeholder={t('search.to')} value={filters.maxPrice} onChange={e => setFilter('maxPrice', e.target.value)} className={input.replace('mt-1.5 ', '')} />
        </div>
      </div>
      {amenities.length > 0 && (
        <fieldset>
          <legend className={label}>{t('search.filterAmenity')}</legend>
          <div className="mt-2 space-y-1">
            {[{ amenityId: 0, name: t('search.all') }, ...amenities].map(a => {
              const value = a.amenityId ? String(a.amenityId) : '';
              return (
                <label key={a.amenityId} className="flex cursor-pointer items-center gap-2.5 rounded-full px-2 py-1.5 text-sm text-on-surface hover:bg-surface-container-low">
                  <input type="radio" name="amenity" checked={filters.amenityId === value} onChange={() => setFilter('amenityId', value)} className="h-4 w-4 accent-primary" />
                  {a.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {chips.length > 0 && (
        <button type="button" onClick={() => { setFilters(f => ({ ...EMPTY_FILTERS, sort: f.sort })); setPage(1); }} className="text-sm font-semibold text-primary hover:underline">{t('search.clearAll')}</button>
      )}
    </div>
  );

  return <main className="min-h-screen bg-background pb-16 pt-40">
    <SearchCard initialSelection={selection} onSearch={value => { setSelection(value); setPage(1); setShowSaved(false); }} />

    <div className="mx-auto max-w-[1280px] px-5 pt-8">
      {notice && <p role="status" className="mb-4 rounded-2xl bg-surface-container p-3 text-sm">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Cột bộ lọc */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm lg:sticky lg:top-28">
            <h2 className="mb-5 flex items-center gap-2 font-semibold text-on-surface"><span className="material-symbols-outlined text-[20px] text-primary">tune</span>{t('search.filters')}</h2>
            {filterPanel}
          </div>
        </aside>

        {/* Kết quả */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-on-surface">
                {showSaved && canUseWishlist ? t('search.savedHotels') : result ? t('search.matching', { count: result.totalCount }) : t('search.pageTitle')}
              </h1>
              <p className="text-sm text-on-surface-variant">{t('search.criteria', { checkIn: selection.checkIn, checkOut: selection.checkOut, adults: selection.adults, children: selection.children, rooms: selection.rooms })}</p>
            </div>
            <button type="button" onClick={() => setFiltersOpen(o => !o)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-outline-variant/60 px-4 text-sm font-semibold lg:hidden">
              <span className="material-symbols-outlined text-[18px]">tune</span>{filtersOpen ? t('search.hideFilters') : t('search.showFilters')}
            </button>
            {canUseWishlist && (
              <button type="button" aria-pressed={showSaved} onClick={() => setShowSaved(!showSaved)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${showSaved ? 'bg-primary text-on-primary' : 'border border-outline-variant/60 text-on-surface hover:bg-surface-container-low'}`}>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{showSaved ? 'search' : 'favorite'}</span>
                {showSaved ? t('search.results') : t('search.favoritesCount', { count: saved.length })}
              </button>
            )}
            {!showSaved && (
              <label className="inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container-lowest pl-4 pr-2 text-sm">
                <span className="text-on-surface-variant">{t('search.sort')}</span>
                <select value={filters.sort} onChange={e => setFilter('sort', e.target.value)} className="bg-transparent font-semibold outline-none">
                  <option value="price_asc">{t('search.sortPriceAsc')}</option>
                  <option value="price_desc">{t('search.sortPriceDesc')}</option>
                  <option value="name">{t('search.sortName')}</option>
                </select>
              </label>
            )}
          </div>

          {!showSaved && chips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {chips.map(c => (
                <button key={c.key} type="button" onClick={() => setFilter(c.key, '')}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/50 px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-primary-fixed">
                  {c.label}<span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ))}
            </div>
          )}

          {showSaved && canUseWishlist ? (
            !saved.length ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest px-6 py-14 text-center shadow-sm">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary"><span className="material-symbols-outlined text-[28px]">favorite</span></span>
                <p className="font-medium text-on-surface">{t('search.savedEmpty')}</p>
                <p className="max-w-md text-sm text-on-surface-variant">{session ? t('search.savedEmptyHint') : t('search.savedEmptyGuest')}</p>
                <button type="button" onClick={() => setShowSaved(false)} className="mt-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary">{t('search.exploreHotels')}</button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {saved.map(h => (
                  <article key={h.hotelId} onClick={() => onSelectHotel?.(toHotel(h, true, ratings[h.hotelId]), selection)}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
                      <img src={mediaUrl(h.imageUrl)} alt={h.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <button type="button" aria-label={t('search.unsaveHotel', { name: h.name })} title={t('search.unsave')} onClick={e => { e.stopPropagation(); void favorite(String(h.hotelId), false); }}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/95 text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      </button>
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <h3 className="font-semibold text-on-surface group-hover:text-primary">{h.name}</h3>
                      <p className="flex items-center gap-1 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">location_on</span><span className="truncate">{[h.address, h.city].filter(Boolean).join(', ')}</span></p>
                      {h.pricePerNight > 0 && (
                        <p className="mt-auto pt-3 text-right text-sm text-on-surface-variant">{t('search.from')} <strong className="text-lg text-on-surface">{formatMoney(h.pricePerNight, locale)}</strong> {t('detail.perNight')}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <>
              {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}<button onClick={() => setRetry(retry + 1)} className="font-semibold underline">{t('search.retry')}</button></div>}
              {loading && (
                <div className="space-y-4" aria-busy="true">
                  {[0, 1, 2].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-surface-container" />)}
                </div>
              )}
              {result && (
                <>
                  <p className="mb-3 text-xs text-on-surface-variant">{t('search.indicativeNote')}</p>
                  <HotelList hotels={result.items.map(h => toHotel(h, saved.some(s => s.hotelId === h.hotelId), ratings[h.hotelId]))} currentPage={page} totalPages={result.totalPages} totalResults={result.totalCount} onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onFavoriteToggle={canUseWishlist ? (id, value) => void favorite(id, value) : undefined} onSelectHotel={h => onSelectHotel?.(h, selection)} />
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  </main>;
};
export default SearchPage;
