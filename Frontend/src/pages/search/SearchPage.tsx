import React, { useState, useMemo } from 'react';
import { SearchSummaryBar } from './components/SearchSummaryBar';
import { FilterSidebar } from './components/FilterSidebar';
import { HotelList } from './components/HotelList';
import { MOCK_HOTELS } from './data/mockHotels';
import { Hotel, SearchFilterState, SortOption } from './types';

interface SearchPageProps {
  initialLocation?: string;
  initialDates?: string;
  initialGuests?: string;
  onNavigateHome?: () => void;
  onSelectHotel?: (hotel: Hotel) => void;
}

const DEFAULT_FILTERS: SearchFilterState = {
  maxPrice: 8500000,
  selectedStarRating: 5,
  propertyTypes: ['resort', 'villa'],
  guestRating: '9plus',
  selectedAmenities: ['Hủy miễn phí', 'Bao gồm bữa sáng'],
};

export const SearchPage: React.FC<SearchPageProps> = ({
  initialLocation = 'Đà Nẵng, Việt Nam',
  initialDates = '15 Th04 – 18 Th04',
  initialGuests = '2 người lớn · 1 phòng',
  onNavigateHome,
  onSelectHotel,
}) => {
  const [location, setLocation] = useState(initialLocation);
  const [dates, setDates] = useState(initialDates);
  const [guests, setGuests] = useState(initialGuests);
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  const [currentSort, setCurrentSort] = useState<SortOption>('popularity');
  const [filters, setFilters] = useState<SearchFilterState>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [hotelsData, setHotelsData] = useState<Hotel[]>(MOCK_HOTELS);

  const handleResetFilters = () => {
    setFilters({
      maxPrice: 15000000,
      selectedStarRating: null,
      propertyTypes: [],
      guestRating: 'all',
      selectedAmenities: [],
    });
  };

  const handleFavoriteToggle = (hotelId: string, isFav: boolean) => {
    setHotelsData((prev) =>
      prev.map((h) => (h.id === hotelId ? { ...h, isFavorite: isFav } : h))
    );
  };

  // Filter & Sort logic
  const filteredHotels = useMemo(() => {
    let list = [...hotelsData];

    // Filter by max price
    list = list.filter((h) => h.pricePerNight <= filters.maxPrice);

    // Filter by star rating if selected
    if (filters.selectedStarRating !== null) {
      list = list.filter((h) => h.starRating === filters.selectedStarRating);
    }

    // Filter by guest rating
    if (filters.guestRating === '9plus') {
      list = list.filter((h) => h.ratingScore >= 9.0);
    } else if (filters.guestRating === '8plus') {
      list = list.filter((h) => h.ratingScore >= 8.0);
    }

    // Sort
    switch (currentSort) {
      case 'rating':
        list.sort((a, b) => b.ratingScore - a.ratingScore);
        break;
      case 'price_asc':
        list.sort((a, b) => a.pricePerNight - b.pricePerNight);
        break;
      case 'price_desc':
        list.sort((a, b) => b.pricePerNight - a.pricePerNight);
        break;
      case 'best_deal':
        list.sort((a, b) => {
          const discountA = a.originalPrice ? a.originalPrice - a.pricePerNight : 0;
          const discountB = b.originalPrice ? b.originalPrice - b.pricePerNight : 0;
          return discountB - discountA;
        });
        break;
      case 'popularity':
      default:
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return list;
  }, [hotelsData, filters, currentSort]);

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full">
        {/* Search Bar & Query Context Banner */}
        <SearchSummaryBar
          location={location}
          dates={dates}
          duration="3 đêm"
          guests={guests}
          totalResults={142}
          currentSort={currentSort}
          onSortChange={setCurrentSort}
          onEditSearch={() => setIsEditingSearch(!isEditingSearch)}
          onNavigateHome={onNavigateHome}
        />

        {/* Inline Quick Search Edit Bar (Toggled when user clicks "Chỉnh sửa") */}
        {isEditingSearch && (
          <div className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin pt-4">
            <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-md border border-surface-container flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block font-label-sm text-label-sm text-outline mb-1 uppercase font-semibold">
                  Địa điểm
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-surface-container-low px-4 py-2.5 rounded-xl font-body-md text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                  placeholder="Nhập địa điểm..."
                />
              </div>

              <div className="flex-1 w-full">
                <label className="block font-label-sm text-label-sm text-outline mb-1 uppercase font-semibold">
                  Thời gian
                </label>
                <input
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  className="w-full bg-surface-container-low px-4 py-2.5 rounded-xl font-body-md text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                  placeholder="Ngày nhận - trả phòng"
                />
              </div>

              <div className="flex-1 w-full">
                <label className="block font-label-sm text-label-sm text-outline mb-1 uppercase font-semibold">
                  Số lượng khách
                </label>
                <input
                  type="text"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full bg-surface-container-low px-4 py-2.5 rounded-xl font-body-md text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                  placeholder="Khách & phòng"
                />
              </div>

              <div className="pt-2 md:pt-5 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditingSearch(false)}
                  className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold cursor-pointer border-0"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dual-Column Layout: Filters (Left) + Hotel Results (Right) */}
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-lg w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left Sidebar: Filters */}
            <FilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              onResetFilters={handleResetFilters}
            />

            {/* Right Column: Hotel Results List & Pagination */}
            <HotelList
              hotels={filteredHotels}
              currentPage={currentPage}
              totalPages={12}
              totalResults={142}
              onPageChange={setCurrentPage}
              onFavoriteToggle={handleFavoriteToggle}
              onSelectHotel={onSelectHotel}
            />
          </div>
        </div>
      </div>
    </main>
  );
};
export default SearchPage;
