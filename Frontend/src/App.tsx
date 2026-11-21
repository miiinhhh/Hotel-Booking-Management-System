import { useEffect, useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/dashboard/Dashboard';
import SearchPage from './pages/search/SearchPage';
import HotelDetailPage from './pages/hotel-detail/HotelDetailPage';
import BookingHistoryPage from './pages/booking-history/BookingHistoryPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import StaffBookingsPage from './pages/staff/StaffBookingsPage';
import ReviewPage from './pages/reviews/ReviewPage';
import OffersPage from './pages/offers/OffersPage';
import AdminPortal from './pages/admin/AdminPortal';
import { defaultSelection, DiscoverySelection, discoveryApi, toHotelDetail } from './services/discoveryApi';
import { DEFAULT_CHECKOUT_DATA } from './pages/checkout/data/mockCheckoutData';
import { Hotel } from './pages/search/types';
import { HotelDetail, Room } from './pages/hotel-detail/types';
import { CheckoutBookingData } from './pages/checkout/types';
import { LoginPage, ProfilePage, RegisterPage } from './pages/account';
import { VnPayReturnPage } from './pages/checkout/VnPayReturnPage';
import { useAuth } from './context/AuthContext';
import { loadHotelRatings } from './services/reviewApi';
import { SELF_PERMISSIONS } from './auth/permissions';

/** Tab tự phục vụ của khách và quyền cần có (chỉ áp dụng khi đã đăng nhập). */
const CUSTOMER_TAB_PERMISSIONS: Record<string, string> = {
  'dat-phong-cua-toi': SELF_PERMISSIONS.bookingView,
  'danh-gia': SELF_PERMISSIONS.reviewManage,
  'yeu-thich': SELF_PERMISSIONS.wishlistManage,
  'thanh-toan': SELF_PERMISSIONS.bookingCreate,
};
import InformationPage, { InformationPageId } from './pages/information/InformationPage';

const informationTabs: InformationPageId[] = ['dieu-khoan', 'chinh-sach-bao-mat', 'tro-giup', 'lien-he'];
const PENDING_CHECKOUT_KEY = 'stayluxe.pending-checkout';

const readPendingCheckout = (): CheckoutBookingData | null => {
  try {
    const value = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    return value ? JSON.parse(value) as CheckoutBookingData : null;
  } catch {
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    return null;
  }
};

const informationTabFromHash = (): InformationPageId | null => {
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  return informationTabs.includes(hash as InformationPageId) ? hash as InformationPageId : null;
};

const portalFromPath = () => {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path === '/admin' || path === '/admin/login') return 'admin-portal';
  if (path === '/staff' || path === '/staff/login') return 'staff-portal';
  return null;
};

function App() {
  const { session, hasRole, hasPermission } = useAuth();
  const [initialPendingCheckout] = useState<CheckoutBookingData | null>(() => readPendingCheckout());
  const isVnPayReturn = typeof window !== 'undefined' && (window.location.pathname.includes('vnpay-return') || window.location.search.includes('txnRef=') || window.location.search.includes('vnp_TxnRef='));
  const [activeTab, setActiveTab] = useState(
    isVnPayReturn
      ? 'vnpay-return'
      : portalFromPath()
        || informationTabFromHash()
        || (initialPendingCheckout ? (session ? 'thanh-toan' : 'dang-nhap') : 'kham-pha'),
  );
  const [searchParams, setSearchParams] = useState<DiscoverySelection>(defaultSelection);
  const [detailStatus, setDetailStatus] = useState('');

  // Khi quyền tự phục vụ bị tắt (kể cả lúc đang mở trang), không render chức năng đó và đưa khách về trang khám phá.
  const requiredTabPermission = session ? CUSTOMER_TAB_PERMISSIONS[activeTab] : undefined;
  const tabBlocked = Boolean(requiredTabPermission && !hasPermission(requiredTabPermission));
  useEffect(() => {
    if (!tabBlocked) return;
    setActiveTab('kham-pha');
    setDetailStatus('Chức năng này hiện không khả dụng với tài khoản của bạn.');
  }, [tabBlocked]);
  const [currentHotelDetail, setCurrentHotelDetail] = useState<HotelDetail | null>(null);
  const [currentCheckoutData, setCurrentCheckoutData] =
    useState<CheckoutBookingData>(initialPendingCheckout || DEFAULT_CHECKOUT_DATA);
  const [pendingCheckoutData, setPendingCheckoutData] =
    useState<CheckoutBookingData | null>(initialPendingCheckout);
  const leaveInternalPortal = () => {
    window.history.replaceState({}, document.title, '/');
    setActiveTab('kham-pha');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncLocation = () => setActiveTab(portalFromPath() || informationTabFromHash() || 'kham-pha');
    const onPopState = () => syncLocation();
    const onHashChange = () => syncLocation();
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'admin-portal')
      window.history.replaceState({}, document.title, session && hasRole('Admin') ? '/admin' : '/admin/login');
    if (activeTab === 'staff-portal')
      window.history.replaceState({}, document.title, session && hasRole('Hotel Staff') && !hasRole('Admin') ? '/staff' : '/staff/login');
  }, [activeTab, session, hasRole]);

  const handleSearchFromDashboard = (params: DiscoverySelection) => {
    setSearchParams(params);
    setActiveTab('tim-kiem');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateCustomerTab = (tab: string) => {
    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.pushState({}, document.title, '/');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateInformationPage = (tab: string) => {
    if (!informationTabs.includes(tab as InformationPageId)) return;
    window.history.pushState({}, document.title, `/#${tab}`);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectHotelFromSearch = async (hotel: Hotel, selection = searchParams) => {
    setDetailStatus('Đang tải thông tin khách sạn…');
    try {
      const [detail, ratings] = await Promise.all([discoveryApi.detail(Number(hotel.id), selection), loadHotelRatings([Number(hotel.id)])]);
      setCurrentHotelDetail(toHotelDetail(detail, selection, ratings[Number(hotel.id)])); setDetailStatus('');
      setActiveTab('chi-tiet-phong'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { setDetailStatus(error instanceof Error ? error.message : 'Không tải được khách sạn.'); }
  };
  const handleNavigateToCheckout = (room?: Room, totalPrice?: number) => {
    if (session && !hasPermission(SELF_PERMISSIONS.bookingCreate)) {
      setDetailStatus('Tài khoản của bạn hiện không có quyền đặt phòng trực tuyến.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    let nextCheckoutData = currentCheckoutData;
    if (room && totalPrice !== undefined) {
      const deposit = Math.round((totalPrice * 30) / 100);
      nextCheckoutData = {
        ...DEFAULT_CHECKOUT_DATA,
        hotelName: room.hotelName || currentHotelDetail?.name || '',
        location: room.hotelAddress || currentHotelDetail?.address || '',
        roomName: room.name,
        roomId: room.roomId,
        hotelId: room.hotelId,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        numberOfGuests: room.requestedGuests || 1,
        guestsText: `${room.requestedGuests || 1} khách`,
        memberDiscount: 0,
        couponCode: '',
        couponDiscount: 0,
        starRatingText: '',
        hotelImage: room.image,
        checkInDateText: room.checkIn || '',
        checkOutDateText: room.checkOut || '',
        nightsCount: room.checkIn && room.checkOut ? Math.round((Date.parse(room.checkOut) - Date.parse(room.checkIn)) / 86400000) : 1,
        roomAmenities: room.features.map((f) => f.text).slice(0, 3),
        totalPrice: totalPrice,
        depositAmount: deposit,
        remainingAmount: totalPrice - deposit,
        originalPrice: totalPrice,
      };
      setCurrentCheckoutData(nextCheckoutData);
    }

    if (!session) {
      setPendingCheckoutData(nextCheckoutData);
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(nextCheckoutData));
      setActiveTab('dang-nhap');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActiveTab('thanh-toan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const continueAfterCustomerAuthentication = () => {
    const pending = pendingCheckoutData || readPendingCheckout();
    if (pending) {
      setCurrentCheckoutData(pending);
      setPendingCheckoutData(null);
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      setActiveTab('thanh-toan');
    } else {
      setActiveTab('tai-khoan');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Staff Portal view has its own dedicated full-page layout
  if (activeTab === 'staff-portal') {
    if (!session || !hasRole('Hotel Staff') || hasRole('Admin')) {
      return <LoginPage portal="staff" onSuccess={() => { window.history.replaceState({}, document.title, '/staff'); setActiveTab('staff-portal'); }} />;
    }
    return (
      <StaffBookingsPage
        onNavigateCustomerPortal={leaveInternalPortal}
      />
    );
  }

  if (activeTab === 'admin-portal') {
    if (!session || !hasRole('Admin')) {
      return <LoginPage portal="admin" onSuccess={() => { window.history.replaceState({}, document.title, '/admin'); setActiveTab('admin-portal'); }} />;
    }
    return (
      <AdminPortal
        onExit={leaveInternalPortal}
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
          navigateCustomerTab(tab);
        }}
      />

      {detailStatus && <p role="status" className="mx-5 mt-24 rounded-lg bg-surface-container p-4">{detailStatus}</p>}
      {/* Main Content Area */}
      <div className="flex-1">
        {!tabBlocked && (activeTab === 'tim-kiem' || activeTab === 'yeu-thich') && (
          <SearchPage
            initialSelection={searchParams}
            initialShowSaved={activeTab === 'yeu-thich'}
            initialLocation={searchParams.location}
            initialDates={searchParams.dates}
            initialGuests={searchParams.guests}
            onNavigateHome={() => setActiveTab('kham-pha')}
            onSelectHotel={handleSelectHotelFromSearch}
          />
        )}

        {activeTab === 'chi-tiet-phong' && currentHotelDetail && (
          <HotelDetailPage
            key={`${currentHotelDetail.id}-${currentHotelDetail.datesText}`}
            hotelData={currentHotelDetail}
            onNavigateHome={() => setActiveTab('kham-pha')}
            onNavigateSearch={() => setActiveTab('tim-kiem')}
            onNavigateCheckout={handleNavigateToCheckout}
          />
        )}

        {activeTab === 'kham-pha' && (
          <Dashboard onNavigateSearch={handleSearchFromDashboard} onRegister={() => setActiveTab('dang-ky')} onLogin={() => setActiveTab('dang-nhap')} />
        )}

        {informationTabs.includes(activeTab as InformationPageId) && (
          <InformationPage
            page={activeTab as InformationPageId}
            onNavigateHome={() => navigateCustomerTab('kham-pha')}
            onNavigatePage={navigateInformationPage}
          />
        )}

        {!tabBlocked && activeTab === 'dat-phong-cua-toi' && (
          <BookingHistoryPage
            onNavigateHome={() => setActiveTab('kham-pha')}
            onNavigateSearch={() => setActiveTab('tim-kiem')}
            onNavigatePayment={() => {
              setActiveTab('thanh-toan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'uu-dai' && (
          <OffersPage onNavigateSearch={() => navigateCustomerTab('tim-kiem')} onNavigateHome={() => navigateCustomerTab('kham-pha')} />
        )}

        {!tabBlocked && activeTab === 'danh-gia' && (
          <ReviewPage
            onNavigateHome={() => setActiveTab('kham-pha')}
            onNavigateHistory={() => setActiveTab('dat-phong-cua-toi')}
          />
        )}

        {!tabBlocked && activeTab === 'thanh-toan' && (
          <CheckoutPage
            initialBookingData={currentCheckoutData}
            onNavigateBack={() => setActiveTab('chi-tiet-phong')}
            onBookingSuccess={(_bookingCode) => {
              setActiveTab('dat-phong-cua-toi');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'dang-nhap' && <LoginPage portal="customer" onRegister={() => setActiveTab('dang-ky')} onSuccess={continueAfterCustomerAuthentication} />}
        {activeTab === 'dang-ky' && <RegisterPage onLogin={() => setActiveTab('dang-nhap')} onSuccess={continueAfterCustomerAuthentication} />}
        {activeTab === 'tai-khoan' && <ProfilePage onLogin={() => setActiveTab('dang-nhap')} onBookings={() => setActiveTab('dat-phong-cua-toi')} />}
        {activeTab === 'vnpay-return' && (
          <VnPayReturnPage
            onNavigateHome={() => {
              window.history.replaceState({}, document.title, window.location.pathname);
              setActiveTab('kham-pha');
            }}
            onNavigateMyBookings={() => {
              window.history.replaceState({}, document.title, window.location.pathname);
              setActiveTab('dat-phong-cua-toi');
            }}
          />
        )}
      </div>

      {/* Footer */}
      <Footer onNavigate={navigateInformationPage} />
    </div>
  );
}

export default App;
