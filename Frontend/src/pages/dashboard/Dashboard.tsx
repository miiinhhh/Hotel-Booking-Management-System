import type { DiscoverySelection } from '../../services/discoveryApi';
import React, { useEffect, useState } from 'react';
import { HeroBanner } from './components/HeroBanner';
import { SearchCard } from './components/SearchCard';
import { discoveryApi, defaultSelection, HotelCardData, mediaUrl } from '../../services/discoveryApi';
import { PrivilegeBanner } from './components/PrivilegeBanner';

interface DashboardProps {
  onNavigateSearch?: (params: DiscoverySelection) => void;
  onRegister?: () => void;
  onLogin?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateSearch, onRegister, onLogin }) => {
  const [suggestions, setSuggestions] = useState<HotelCardData[]>([]);
  const [suggestionError, setSuggestionError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const selection = defaultSelection();
    discoveryApi.search({ checkIn: selection.checkIn, checkOut: selection.checkOut, adults: 2, rooms: 1, pageSize: 4 }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setSuggestions(data.items); })
      .catch(e => { if (!controller.signal.aborted) setSuggestionError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const handleSearch = (searchParams: DiscoverySelection) => {
    if (onNavigateSearch) {
      onNavigateSearch(searchParams);
    }
  };

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full relative">
        {/* HERO BANNER */}
        <HeroBanner />

        {/* FLOATING SEARCH CARD */}
        <SearchCard onSearch={handleSearch} />

        {/* KHÁCH SẠN CÒN PHÒNG HÔM NAY */}
        <section className="mx-auto mt-12 w-full max-w-[1440px] px-5">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-on-surface md:text-3xl">Khách sạn còn phòng hôm nay</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Giá cho 1 phòng, 2 người lớn, đêm nay</p>
            </div>
            {onNavigateSearch && (
              <button type="button" onClick={() => onNavigateSearch(defaultSelection())}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                Xem tất cả<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            )}
          </div>
          {suggestionError && <p role="alert" className="rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{suggestionError}</p>}
          {!loading && !suggestionError && !suggestions.length && (
            <p className="rounded-2xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">Chưa có phòng trống cho hôm nay. Hãy chọn ngày khác.</p>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm" aria-hidden="true">
                <div className="aspect-[4/3] animate-pulse bg-surface-container" />
                <div className="space-y-2 p-4"><div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-container" /><div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-container" /></div>
              </div>
            ))}
            {suggestions.map(h => (
              <button key={h.hotelId} type="button" onClick={() => onNavigateSearch?.({ ...defaultSelection(), location: h.city })}
                className="group flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest text-left shadow-sm transition-shadow hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
                  {h.imageUrl && <img src={mediaUrl(h.imageUrl)} alt={h.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                  {h.availableRooms <= 3 && (
                    <span className="absolute left-3 top-3 rounded-full bg-surface-container-lowest/95 px-2.5 py-1 text-xs font-semibold text-error shadow-sm">Chỉ còn {h.availableRooms} phòng</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-1 font-semibold text-on-surface">{h.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>{h.city}
                  </p>
                  <p className="mt-2 line-clamp-1 text-xs text-on-surface-variant">{h.roomTypeName} · tối đa {h.capacity} khách</p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <span className="text-xs text-emerald-700">{h.availableRooms} phòng trống</span>
                    <span className="text-right">
                      <span className="block text-[11px] text-on-surface-variant">Từ</span>
                      <strong className="text-lg text-on-surface">{h.pricePerNight.toLocaleString('vi-VN')} ₫</strong>
                      <span className="text-xs text-on-surface-variant"> /đêm</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* CURATED PRIVILEGES BANNER */}
        <PrivilegeBanner onRegister={onRegister} onLogin={onLogin} />
      </div>
    </main>
  );
};
export default Dashboard;
