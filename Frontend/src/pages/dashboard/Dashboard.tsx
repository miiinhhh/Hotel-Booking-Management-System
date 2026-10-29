import type { DiscoverySelection } from '../../services/discoveryApi';
import React, { useEffect, useState } from 'react';
import { HeroBanner } from './components/HeroBanner';
import { SearchCard } from './components/SearchCard';
import { QuickFilters } from './components/QuickFilters';
import { discoveryApi, defaultSelection, HotelCardData, mediaUrl } from '../../services/discoveryApi';
import { PrivilegeBanner } from './components/PrivilegeBanner';

interface DashboardProps {
  onNavigateSearch?: (params: DiscoverySelection) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateSearch }) => {
  const [suggestions, setSuggestions] = useState<HotelCardData[]>([]);
  const [suggestionError, setSuggestionError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const selection = defaultSelection();
    discoveryApi.search({ checkIn: selection.checkIn, checkOut: selection.checkOut, adults: 2, rooms: 1, pageSize: 3 }, controller.signal)
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

  const handleFilterChange = (filterId: string) => {
    console.log('Selected filter:', filterId);
  };

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full relative">
        {/* HERO BANNER */}
        <HeroBanner />

        {/* FLOATING SEARCH CARD */}
        <SearchCard onSearch={handleSearch} />

        {/* QUICK FILTERS PILLS */}
        <QuickFilters onFilterChange={handleFilterChange} />

        {/* POPULAR DESTINATIONS */}
        <section className="mx-auto my-12 w-full max-w-[1440px] px-5"><h2 className="mb-5 text-3xl font-semibold">Khách sạn còn phòng hôm nay</h2>
          {loading && <p role="status">Đang tải gợi ý…</p>}{suggestionError && <p role="alert">{suggestionError}</p>}
          {!loading && !suggestionError && !suggestions.length && <p>Chưa có phòng trống cho hôm nay. Hãy chọn ngày khác.</p>}
          <div className="grid gap-5 md:grid-cols-3">{suggestions.map(h => <button key={h.hotelId} className="overflow-hidden rounded-xl bg-surface-container-lowest text-left shadow-sm" onClick={() => onNavigateSearch?.({ ...defaultSelection(), location: h.city })}><img src={mediaUrl(h.imageUrl)} alt={h.name} className="h-48 w-full object-cover" /><div className="p-5"><h3 className="text-xl font-semibold">{h.name}</h3><p>{h.city}</p><p className="mt-3 font-semibold">Từ {h.pricePerNight.toLocaleString('vi-VN')} ₫ / đêm</p><p>{h.availableRooms} phòng khả dụng</p></div></button>)}</div></section>

        {/* CURATED PRIVILEGES BANNER */}
        <PrivilegeBanner />
      </div>
    </main>
  );
};
export default Dashboard;
