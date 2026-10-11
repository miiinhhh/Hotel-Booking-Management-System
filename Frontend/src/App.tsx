import { useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/dashboard/Dashboard';
import SearchPage from './pages/search/SearchPage';
import HotelDetailPage from './pages/hotel-detail/HotelDetailPage';
import { MOCK_HOTEL_DETAIL } from './pages/hotel-detail/data/mockHotelDetail';
import { Hotel } from './pages/search/types';
import { HotelDetail } from './pages/hotel-detail/types';

function App() {
  const [activeTab, setActiveTab] = useState('tim-kiem');
  const [searchParams, setSearchParams] = useState({
    location: 'Đà Nẵng, Việt Nam',
    dates: '15 Th04 – 18 Th04',
    guests: '2 người lớn · 1 phòng',
  });
  const [currentHotelDetail, setCurrentHotelDetail] = useState<HotelDetail>(MOCK_HOTEL_DETAIL);

  const handleSearchFromDashboard = (params: {
    location: string;
    dates: string;
    guests: string;
  }) => {
    setSearchParams(params);
    setActiveTab('tim-kiem');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectHotelFromSearch = (hotel: Hotel) => {
    // If the selected hotel is already InterContinental, use default detail
    // Otherwise customize the detail view with the selected hotel's basic info
    if (hotel.id === 'intercontinental-danang') {
      setCurrentHotelDetail(MOCK_HOTEL_DETAIL);
    } else {
      setCurrentHotelDetail({
        ...MOCK_HOTEL_DETAIL,
        id: hotel.id,
        name: hotel.name,
        address: hotel.location,
        distanceToBeach: hotel.distanceInfo || 'Cách biển 100m',
        ratingScore: hotel.ratingScore,
        ratingText: hotel.ratingText,
        reviewCount: hotel.reviewCount,
        starRating: hotel.starRating,
        galleryImages: {
          ...MOCK_HOTEL_DETAIL.galleryImages,
          hero: {
            ...MOCK_HOTEL_DETAIL.galleryImages.hero,
            url: hotel.image,
            caption: hotel.name,
          },
        },
      });
    }

    setActiveTab('chi-tiet-phong');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Fixed Header */}
      <Header
        activeTab={activeTab === 'chi-tiet-phong' ? 'tim-kiem' : activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1">
        {activeTab === 'tim-kiem' && (
          <SearchPage
            initialLocation={searchParams.location}
            initialDates={searchParams.dates}
            initialGuests={searchParams.guests}
            onNavigateHome={() => setActiveTab('kham-pha')}
            onSelectHotel={handleSelectHotelFromSearch}
          />
        )}

        {activeTab === 'chi-tiet-phong' && (
          <HotelDetailPage
            hotelData={currentHotelDetail}
            onNavigateHome={() => setActiveTab('kham-pha')}
            onNavigateSearch={() => setActiveTab('tim-kiem')}
          />
        )}

        {activeTab === 'kham-pha' && (
          <Dashboard onNavigateSearch={handleSearchFromDashboard} />
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
