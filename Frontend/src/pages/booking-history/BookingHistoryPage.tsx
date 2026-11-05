import React, { useState, useMemo } from 'react';
import { BookingStatsRow } from './components/BookingStatsRow';
import { AssuranceBanner } from './components/AssuranceBanner';
import { BookingTabs } from './components/BookingTabs';
import { BookingTicketCard } from './components/BookingTicketCard';
import { CancelBookingModal } from './components/CancelBookingModal';
import { ReviewStayModal } from './components/ReviewStayModal';
import { FloatingSupport } from './components/FloatingSupport';
import { useBookingsQuery, useCancelBookingMutation } from '../../hooks/useBookingQueries';
import { createVnPayPayment } from '../../services/paymentApi';
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
  // Query & Mutation hooks có cơ chế Invalidate Cache tự động
  const { bookings, isLoading, error, refetch } = useBookingsQuery();
  const { cancelBookingAsync } = useCancelBookingMutation();

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

  const handlePayNow = async (booking: BookingItem) => {
    const bookingIdNum = Number(booking.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      try {
        const res = await createVnPayPayment(bookingIdNum, 'Deposit');
        if (res.success && res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
          return;
        } else {
          showToast(`Lỗi: ${res.message || 'Không thể tạo liên kết thanh toán VNPay.'}`);
        }
      } catch (err) {
        showToast(`Lỗi: ${err instanceof Error ? err.message : 'Lỗi kết nối máy chủ'}`);
      }
    } else {
      onNavigatePayment?.(booking);
    }
  };

  // Cancel booking confirm sử dụng Mutation và tự động Invalidate Cache
  const handleConfirmCancel = async (bookingId: string, reason: string) => {
    const bookingIdNum = Number(bookingId);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      const success = await cancelBookingAsync({ bookingId: bookingIdNum, reason });
      if (!success) {
        showToast('Lỗi: Không thể hủy đơn đặt phòng trên máy chủ.');
        return;
      }
    }

    setCancelModalBooking(null);
    showToast(
      `Đã hủy đơn thành công. Trạng thái đã được đồng bộ tự động theo chính sách lưu trú.`
    );
  };

  // Submit review confirm
  const handleSubmitReview = (_bookingId: string, rating: number, _comment: string) => {
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
              {isLoading ? (
                /* Loading State Skeletons */
                <div className="flex flex-col gap-4 animate-pulse">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 flex flex-col md:flex-row gap-6 items-center"
                    >
                      <div className="w-full md:w-56 h-36 bg-surface-container-high rounded-xl" />
                      <div className="flex-1 space-y-3 w-full">
                        <div className="h-6 bg-surface-container-high rounded-md w-1/3" />
                        <div className="h-4 bg-surface-container rounded-md w-1/2" />
                        <div className="h-4 bg-surface-container rounded-md w-1/4" />
                      </div>
                      <div className="w-32 h-10 bg-surface-container-high rounded-full" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                /* Error State */
                <div className="bg-surface-container-lowest rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 border border-error/20">
                  <div className="w-14 h-14 rounded-full bg-error-container/20 flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-[30px]">error</span>
                  </div>
                  <h3 className="font-headline-sm text-lg text-on-surface">Không thể tải dữ liệu</h3>
                  <p className="font-body-md text-sm text-on-surface-variant max-w-md">{error}</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 px-5 py-2 rounded-full bg-primary text-on-primary font-label-md text-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : filteredBookings.length > 0 ? (
                /* Bookings List */
                filteredBookings.map((booking) => (
                  <BookingTicketCard
                    key={booking.id}
                    booking={booking}
                    onCopyCode={handleCopyCode}
                    onOpenCancelModal={(b) => setCancelModalBooking(b)}
                    onOpenReviewModal={(b) => setReviewModalBooking(b)}
                    onPayNow={handlePayNow}
                    onRebook={() => onNavigateSearch?.()}
                  />
                ))
              ) : (
                /* Empty State */
                <div className="bg-surface-container-lowest rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 border border-outline-variant/20 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[32px]">event_busy</span>
                  </div>
                  <h3 className="font-headline-sm text-lg text-on-surface">
                    Không có đơn đặt phòng nào
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant max-w-md">
                    {searchQuery.trim()
                      ? `Không tìm thấy đơn đặt phòng khớp với từ khóa "${searchQuery}".`
                      : activeTab === 'upcoming'
                      ? 'Quý khách chưa có kỳ nghỉ nào sắp diễn ra. Hãy lên kế hoạch cho chuyến đi tiếp theo ngay hôm nay!'
                      : activeTab === 'completed'
                      ? 'Chưa có lịch sử các chuyến nghỉ dưỡng đã hoàn tất.'
                      : 'Quý khách không có đơn đặt phòng nào bị hủy.'}
                  </p>
                  <button
                    onClick={() => onNavigateSearch?.()}
                    className="mt-3 px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
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
