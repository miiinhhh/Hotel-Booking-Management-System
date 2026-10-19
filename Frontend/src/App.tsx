import { useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/dashboard/Dashboard';
import SearchPage from './pages/search/SearchPage';
import HotelDetailPage from './pages/hotel-detail/HotelDetailPage';
import BookingHistoryPage from './pages/booking-history/BookingHistoryPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import StaffBookingsPage from './pages/staff/StaffBookingsPage';
import ReviewPage from './pages/reviews/ReviewPage';
import AdminPortal from './pages/admin/AdminPortal';
import { MOCK_HOTEL_DETAIL } from './pages/hotel-detail/data/mockHotelDetail';
import { DEFAULT_CHECKOUT_DATA } from './pages/checkout/data/mockCheckoutData';
import { Hotel } from './pages/search/types';
import { HotelDetail, Room } from './pages/hotel-detail/types';
import { CheckoutBookingData } from './pages/checkout/types';

function App() {
  const [activeTab, setActiveTab] = useState('tim-kiem');
  const [searchParams, setSearchParams] = useState({
    location: 'Đà Nẵng, Việt Nam',
    dates: '15 Th04 – 18 Th04',
    guests: '2 người lớn · 1 phòng',
  });
  const [currentHotelDetail, setCurrentHotelDetail] = useState<HotelDetail>(MOCK_HOTEL_DETAIL);
  const [currentCheckoutData, setCurrentCheckoutData] =
    useState<CheckoutBookingData>(DEFAULT_CHECKOUT_DATA);

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

  const handleNavigateToCheckout = (room?: Room, totalPrice?: number) => {
    if (room && totalPrice) {
      const deposit = Math.round((totalPrice * 30) / 100);
      setCurrentCheckoutData({
        ...DEFAULT_CHECKOUT_DATA,
        hotelName: currentHotelDetail.name,
        location: currentHotelDetail.address,
        hotelImage: currentHotelDetail.galleryImages.hero.url,
        roomName: room.name,
        roomAmenities: room.features.map((f) => f.text).slice(0, 3),
        totalPrice: totalPrice,
        depositAmount: deposit,
        remainingAmount: totalPrice - deposit,
        originalPrice: totalPrice + 1000000,
      });
    }
    setActiveTab('thanh-toan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Staff Portal view has its own dedicated full-page layout
  if (activeTab === 'staff-portal') {
    return (
      <StaffBookingsPage
        onNavigateCustomerPortal={() => {
          setActiveTab('kham-pha');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  if (activeTab === 'admin-portal') {
    return (
      <AdminPortal
        onExit={() => {
          setActiveTab('kham-pha');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Fixed Header */}
      <Header
        activeTab={
          activeTab === 'chi-tiet-phong'
            ? 'tim-kiem'
            : activeTab === 'thanh-toan'
            ? 'dat-phong-cua-toi'
            : activeTab
        }
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
            onNavigateCheckout={handleNavigateToCheckout}
          />
        )}

        {activeTab === 'kham-pha' && (
          <Dashboard onNavigateSearch={handleSearchFromDashboard} />
        )}

        {activeTab === 'dat-phong-cua-toi' && (
          <BookingHistoryPage
            onNavigateHome={() => setActiveTab('kham-pha')}
            onNavigateSearch={() => setActiveTab('tim-kiem')}
            onNavigatePayment={() => {
              setActiveTab('thanh-toan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'danh-gia' && (
          <ReviewPage
            onNavigateHome={() => setActiveTab('kham-pha')}
            onNavigateHistory={() => setActiveTab('dat-phong-cua-toi')}
          />
        )}

        {activeTab === 'thanh-toan' && (
          <CheckoutPage
            initialBookingData={currentCheckoutData}
            onNavigateBack={() => setActiveTab('chi-tiet-phong')}
            onBookingSuccess={(_bookingCode) => {
              setActiveTab('dat-phong-cua-toi');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
