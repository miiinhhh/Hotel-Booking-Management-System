import { BookingDetailsDrawer } from './components/BookingDetailsDrawer';
import { reviewApi } from '../../services/reviewApi';
import { useAuth } from '../../context/AuthContext';
import { SELF_PERMISSIONS } from '../../auth/permissions';
import React, { useState, useMemo, useEffect } from 'react';
import { BookingStatsRow } from './components/BookingStatsRow';
import { AssuranceBanner } from './components/AssuranceBanner';
import { BookingTabs } from './components/BookingTabs';
import { BookingTicketCard } from './components/BookingTicketCard';
import { useLanguage } from '../../i18n/LanguageContext';
import { RescheduleDialog } from '../../components/booking/RescheduleDialog';
import { CancelBookingModal } from './components/CancelBookingModal';
import { ReviewStayModal } from './components/ReviewStayModal';
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
  const { t } = useLanguage();
  const { bookings, isLoading, error, refetch } = useBookingsQuery();
  const { cancelBookingAsync } = useCancelBookingMutation();

  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Modal states
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingItem | null>(null);
  const [reviewModalBooking, setReviewModalBooking] = useState<BookingItem | null>(null);

  // Booking nào đã có đánh giá trong CSDL (để hiển thị "Sửa đánh giá")
  const { hasPermission } = useAuth();
  const canReview = hasPermission(SELF_PERMISSIONS.reviewManage);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  /** Đơn có đánh giá đã bị khách xóa: không viết lại được (đánh giá đã xóa không khôi phục). */
  const [detailBooking, setDetailBooking] = useState<BookingItem | null>(null);
  const [deletedReviewIds, setDeletedReviewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!canReview) return;
    let alive = true;
    reviewApi.mine()
      .then((page) => {
        if (!alive) return;
        setReviewedIds(new Set(page.items.filter((r) => r.status !== 'Deleted').map((r) => String(r.bookingId))));
        setDeletedReviewIds(new Set(page.items.filter((r) => r.status === 'Deleted').map((r) => String(r.bookingId))));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [canReview]);

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
    // Chỉ đơn đã xác nhận mới là "chuyến đi sắp diễn ra"; đơn chưa thanh toán đếm riêng.
    const upcoming = bookings.filter((b) => b.status === 'confirmed').length;
    const pendingPayment = bookings.filter((b) => b.status === 'pending').length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return {
      upcomingCount: upcoming,
      pendingPaymentCount: pendingPayment,
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
        showToast(t('history.copied', { code }));
      }).catch(() => {
        showToast(t('history.codeIs', { code }));
      });
    } else {
      showToast(t('history.codeIs', { code }));
    }
  };

  const handlePayNow = async (booking: BookingItem, paymentTarget: 'Deposit' | 'Full' = 'Deposit') => {
    const bookingIdNum = Number(booking.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      try {
        const res = await createVnPayPayment(bookingIdNum, paymentTarget);
        if (res.success && res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
          return;
        } else {
          showToast(t('history.errorPrefix', { message: res.message || t('checkout.errVnpay') }));
        }
      } catch (err) {
        showToast(t('history.errorPrefix', { message: err instanceof Error ? err.message : t('history.errNetwork') }));
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
        showToast(t('history.errorPrefix', { message: t('history.errCancel') }));
        return;
      }
    }

    setCancelModalBooking(null);
    showToast(t('history.cancelled'));
  };

  // Submit review confirm
  const handleSubmitReview = (bookingId: string, rating: number, isUpdate: boolean) => {
    setReviewModalBooking(null);
    setReviewedIds((prev) => new Set(prev).add(bookingId));
    showToast(isUpdate ? t('history.reviewUpdated', { rating }) : t('history.reviewThanks', { rating }));
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
            {rescheduleTarget && (
              <RescheduleDialog open bookingId={Number(rescheduleTarget.id)} bookingCode={rescheduleTarget.bookingCode}
                checkInDate={rescheduleTarget.checkInDate} checkOutDate={rescheduleTarget.checkOutDate}
                onClose={() => setRescheduleTarget(null)}
                onDone={(msg) => { setRescheduleTarget(null); showToast(msg); void refetch(); }} />
            )}

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
                {t('history.breadcrumbHome')}
              </a>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="hover:text-primary transition-colors">{t('history.breadcrumbAccount')}</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface font-semibold">{t('history.breadcrumbPage')}</span>
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
                  <h3 className="font-headline-sm text-lg text-on-surface">{t('history.loadFailed')}</h3>
                  <p className="font-body-md text-sm text-on-surface-variant max-w-md">{error}</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 px-5 py-2 rounded-full bg-primary text-on-primary font-label-md text-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {t('history.retry')}
                  </button>
                </div>
              ) : filteredBookings.length > 0 ? (
                /* Bookings List */
                filteredBookings.map((booking) => (
                  <BookingTicketCard
                    key={booking.id}
                    booking={{ ...booking, hasReview: reviewedIds.has(booking.id), reviewDeleted: deletedReviewIds.has(booking.id) }}
                    onCopyCode={handleCopyCode}
                    onOpenCancelModal={(b) => setCancelModalBooking(b)}
                    onOpenReviewModal={(b) => setReviewModalBooking(b)}
                    onPayNow={handlePayNow}
                    onRebook={() => onNavigateSearch?.()}
                    onReschedule={(b) => setRescheduleTarget(b)}
                    onViewDetails={(b) => setDetailBooking(b)}
                  />
                ))
              ) : (
                /* Empty State */
                <div className="bg-surface-container-lowest rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 border border-outline-variant/20 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[32px]">event_busy</span>
                  </div>
                  <h3 className="font-headline-sm text-lg text-on-surface">
                    {t('history.emptyTitle')}
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant max-w-md">
                    {searchQuery.trim()
                      ? t('history.emptySearch', { query: searchQuery })
                      : activeTab === 'upcoming'
                      ? t('history.emptyUpcoming')
                      : activeTab === 'completed'
                      ? t('history.emptyCompleted')
                      : t('history.emptyCancelled')}
                  </p>
                  <button
                    onClick={() => onNavigateSearch?.()}
                    className="mt-3 px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {t('history.findStay')}
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

        <BookingDetailsDrawer booking={detailBooking} onClose={() => setDetailBooking(null)} />

        {/* Review Stay Modal */}
        <ReviewStayModal
          isOpen={reviewModalBooking !== null}
          booking={reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          onSubmitReview={handleSubmitReview}
          onDeleted={(id) => {
            setReviewModalBooking(null);
            setReviewedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
            setDeletedReviewIds((prev) => new Set(prev).add(id));
            showToast(t('history.reviewDeleted'));
          }}
        />

      </div>
    </main>
  );
};

export default BookingHistoryPage;
