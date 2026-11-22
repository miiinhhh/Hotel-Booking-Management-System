import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ReviewStayModal } from '../booking-history/components/ReviewStayModal';
import { BookingItem } from '../booking-history/types';
import { useBookingsQuery } from '../../hooks/useBookingQueries';
import { reviewApi, ReviewDto } from '../../services/reviewApi';
import { parseReviewComment } from '../booking-history/reviewFormat';

interface ReviewPageProps {
  booking?: BookingItem;
  onNavigateHome?: () => void;
  onNavigateHistory?: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ booking, onNavigateHome, onNavigateHistory }) => {
  const { t, locale } = useLanguage();
  const { bookings, isLoading, error, refetch } = useBookingsQuery();
  const [reviews, setReviews] = useState<Record<string, ReviewDto>>({});
  const [reviewsError, setReviewsError] = useState('');
  const [selected, setSelected] = useState<BookingItem | null>(booking ?? null);
  const [toast, setToast] = useState('');

  const loadReviews = () => {
    setReviewsError('');
    reviewApi.mine()
      .then((page) => setReviews(Object.fromEntries(page.items.filter((r) => r.status !== 'Deleted').map((r) => [String(r.bookingId), r]))))
      .catch((e) => setReviewsError(e instanceof Error ? e.message : t('reviews.loadFailed')));
  };
  useEffect(loadReviews, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Chỉ kỳ nghỉ đã hoàn tất mới đánh giá được (Backend cũng kiểm tra lại).
  const completed = useMemo(() => bookings.filter((b) => b.isEligibleForReview), [bookings]);
  const pending = completed.filter((b) => !reviews[b.id]);
  const done = completed.filter((b) => reviews[b.id]);

  const fmtDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const renderCard = (item: BookingItem) => {
    const review = reviews[item.id];
    const preview = review ? parseReviewComment(review.comment).comment : '';
    const isPendingApproval = review?.status === 'Hidden';
    return (
      <article key={item.id} className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm sm:flex-row">
        <img src={item.image} alt={item.imageAlt || item.hotelName} loading="lazy" className="h-40 w-full shrink-0 bg-surface-container object-cover sm:h-auto sm:w-48" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-on-surface">{item.hotelName || item.bookingCode}</h3>
              <p className="text-sm text-on-surface-variant">
                {[item.roomType, `${fmtDate(item.checkInDate)} – ${fmtDate(item.checkOutDate)}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            {review && (
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isPendingApproval ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {isPendingApproval ? t('reviews.pending') : t('reviews.visible')}
              </span>
            )}
          </div>

          {review && (
            <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${review.rating}/5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: `'FILL' ${i < review.rating ? 1 : 0}` }}>star</span>
              ))}
            </div>
          )}
          {preview && <p className="line-clamp-2 text-sm text-on-surface">“{preview}”</p>}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-on-surface-variant">
              {t('reviews.code')} {item.bookingCode}
              {review && <> · {t('reviews.updated')} {new Date(review.updatedAt || review.createdAt).toLocaleDateString(locale)}</>}
            </p>
            <button type="button" onClick={() => setSelected(item)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${review ? 'border border-outline-variant text-on-surface hover:bg-surface-container' : 'bg-primary text-on-primary hover:opacity-90'}`}>
              <span className="material-symbols-outlined text-[18px]" style={review ? undefined : { fontVariationSettings: "'FILL' 1" }}>{review ? 'edit' : 'star'}</span>
              {review ? t('reviews.edit') : t('reviews.write')}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-4 pb-16 pt-28">
      <header className="space-y-1">
        <h1 className="font-headline-md text-2xl font-bold text-on-surface">{t('reviews.title')}</h1>
        <p className="text-sm text-on-surface-variant">{t('reviews.subtitle')}</p>
      </header>

      {toast && <p role="status" className="rounded-2xl bg-surface-container p-3 text-sm">{toast}</p>}
      {(error || reviewsError) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">
          <span>{error || reviewsError}</span>
          <button type="button" onClick={() => { refetch(); loadReviews(); }} className="font-semibold underline">{t('reviews.retry')}</button>
        </div>
      )}

      {isLoading ? (
        <p role="status" className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">{t('reviews.loading')}</p>
      ) : !completed.length ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary"><span className="material-symbols-outlined text-[28px]">rate_review</span></span>
          <p className="font-medium text-on-surface">{t('reviews.empty')}</p>
          <p className="max-w-md text-sm text-on-surface-variant">{t('reviews.emptyHint')}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            {onNavigateHistory && <button type="button" onClick={onNavigateHistory} className="rounded-full bg-surface-container px-6 py-2.5 font-label-md text-label-md hover:bg-surface-container-high">{t('reviews.viewHistory')}</button>}
            {onNavigateHome && <button type="button" onClick={onNavigateHome} className="rounded-full bg-primary-container px-6 py-2.5 font-label-md text-label-md text-on-primary shadow-md hover:bg-tertiary-container">{t('reviews.home')}</button>}
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-on-surface">{t('reviews.toReview', { count: pending.length })}</h2>
            {pending.length ? pending.map(renderCard) : <p className="flex items-center gap-2 rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-[20px] text-emerald-600">task_alt</span>{t('reviews.allDone')}</p>}
          </section>
          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-on-surface">{t('reviews.reviewed', { count: done.length })}</h2>
              {done.map(renderCard)}
            </section>
          )}
        </>
      )}

      <ReviewStayModal
        isOpen={selected !== null}
        booking={selected}
        onClose={() => setSelected(null)}
        onSubmitReview={(_bookingId, rating, isUpdate) => {
          setSelected(null);
          setToast(isUpdate ? t('history.reviewUpdated', { rating }) : t('history.reviewThanks', { rating }));
          loadReviews();
        }}
      />
    </main>
  );
};
export default ReviewPage;
