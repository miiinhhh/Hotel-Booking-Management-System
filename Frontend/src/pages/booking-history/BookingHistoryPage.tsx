import React, { useState, useMemo } from 'react';
import { BookingStatsRow } from './components/BookingStatsRow';
import { AssuranceBanner } from './components/AssuranceBanner';
import { BookingTabs } from './components/BookingTabs';
import { BookingTicketCard } from './components/BookingTicketCard';
import { CancelBookingModal } from './components/CancelBookingModal';
import { ReviewStayModal } from './components/ReviewStayModal';
import { FloatingSupport } from './components/FloatingSupport';
import { MOCK_BOOKINGS } from './data/mockBookings';
import { BookingItem, BookingTab, BookingStats } from './types';

interface BookingHistoryPageProps {
  onNavigateHome?: () => void;
  onNavigatePayment?: (booking?: BookingItem) => void;
  onNavigateSearch?: () => void;
}

export const BookingHistoryPage: React.FC<BookingHistoryPageProps> = ({
  onNavigateHome,
  onNavigatePayment,
  onNavigateSearch,
}) => {
  const [bookings, setBookings] = useState<BookingItem[]>(MOCK_BOOKINGS);
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Modal states
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingItem | null>(null);
  const [reviewModalBooking, setReviewModalBooking] = useState<BookingItem | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Stats calculation
  const stats: BookingStats = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'pending'
    ).length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return {
      upcomingCount: upcoming,
      completedCount: completed,
      cancelledCount: cancelled,
    };
  }, [bookings]);

  // Filtered & Sorted bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        // Tab filtering
        if (activeTab === 'upcoming') {
          if (booking.status !== 'confirmed' && booking.status !== 'pending') return false;
        } else if (activeTab === 'completed') {
          if (booking.status !== 'completed') return false;
        } else if (activeTab === 'cancelled') {
          if (booking.status !== 'cancelled') return false;
        }

        // Search filtering
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCode = booking.bookingCode.toLowerCase().includes(q);
          const matchHotel = booking.hotelName.toLowerCase().includes(q);
          const matchRoom = booking.roomType.toLowerCase().includes(q);
          return matchCode || matchHotel || matchRoom;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-desc') {
          return b.totalAmount - a.totalAmount;
        }
        return 0; // Default recent order
      });
  }, [bookings, activeTab, searchQuery, sortBy]);

  // Copy code handler
  const handleCopyCode = (code: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        showToast(`Đã sao chép mã đặt phòng: ${code}`);
      }).catch(() => {
        showToast(`Mã đặt phòng: ${code}`);
      });
    } else {
      showToast(`Mã đặt phòng: ${code}`);
    }
  };

  // Cancel booking confirm
  const handleConfirmCancel = (bookingId: string, reason: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'cancelled',
              statusLabel: 'ĐÃ HỦY (CANCELLED)',
              depositBadge: 'ĐÃ HOÀN TIỀN 100%',
              paidAmount: 0,
              remainingAmount: 0,
            }
          : b
      )
    );
    setCancelModalBooking(null);
    showToast(
      `Đã ghi nhận yêu cầu hủy phòng do "${reason}". Số tiền hoàn sẽ được gửi về tài khoản trong vòng 24h.`
    );
  };

  // Submit review confirm
  const handleSubmitReview = (bookingId: string, rating: number, _comment: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              isEligibleForReview: false,
            }
          : b
      )
    );
    setReviewModalBooking(null);
    showToast(
      `Cảm ơn quý khách đã đánh giá ${rating} sao! +250 Điểm StayLuxe Rewards đã được cộng vào tài khoản.`
    );
  };

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full relative">
        {/* Subtle Background Ambience Glow */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-96 -left-20 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

          {/* Main Content Container */}
          <div className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-lg">
            {/* Notification Toast */}
            {toastMessage && (
              <div className="fixed top-24 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  check_circle
                </span>
                <span className="font-body-md text-sm font-medium">{toastMessage}</span>
              </div>
            )}

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 font-label-sm text-label-sm text-outline">
              <a
                href="#kham-pha"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateHome?.();
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Trang chủ
              </a>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="hover:text-primary transition-colors">Tài khoản</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Đặt phòng của tôi</span>
            </nav>

            {/* Stats Header Row */}
            <BookingStatsRow stats={stats} />

            {/* UC-12 Refund Assurance Banner */}
            <AssuranceBanner />

            {/* Filter and Tab Navigation Bar */}
            <BookingTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              stats={stats}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* Booking Ticket Cards List */}
            <div className="flex flex-col gap-space-lg" id="tickets-container">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <BookingTicketCard
                    key={booking.id}
                    booking={booking}
                    onCopyCode={handleCopyCode}
                    onOpenCancelModal={(b) => setCancelModalBooking(b)}
                    onOpenReviewModal={(b) => setReviewModalBooking(b)}
                    onPayNow={(b) => onNavigatePayment?.(b)}
                    onRebook={() => onNavigateSearch?.()}
                  />
                ))
              ) : (
                <div className="bg-surface-container-lowest rounded-lg p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[32px]">event_busy</span>
                  </div>
                  <h3 className="font-headline-sm text-lg text-on-surface">
                    Không có đơn đặt phòng nào
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant max-w-md">
                    Không tìm thấy đặt phòng phù hợp trong mục này. Quý khách có thể khám phá thêm các khu nghỉ dưỡng đẳng cấp để lên kế hoạch du lịch.
                  </p>
                  <button
                    onClick={() => onNavigateSearch?.()}
                    className="mt-2 px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Tìm kỳ nghỉ dưỡng mới
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Booking Modal */}
        <CancelBookingModal
          isOpen={cancelModalBooking !== null}
          booking={cancelModalBooking}
          onClose={() => setCancelModalBooking(null)}
          onConfirmCancel={handleConfirmCancel}
        />

        {/* Review Stay Modal */}
        <ReviewStayModal
          isOpen={reviewModalBooking !== null}
          booking={reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          onSubmitReview={handleSubmitReview}
        />

        {/* VIP Concierge Floating Support Button */}
        <FloatingSupport />
      </div>
    </main>
  );
};

export default BookingHistoryPage;
