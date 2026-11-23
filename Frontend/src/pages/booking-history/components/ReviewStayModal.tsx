import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage, TranslationKey } from '../../../i18n/LanguageContext';
import { BookingItem } from '../types';
import { reviewApi } from '../../../services/reviewApi';
import { composeReviewComment, CriteriaRatings, DEFAULT_CRITERIA, parseReviewComment, REVIEW_TAGS, tagLabelKey } from '../reviewFormat';

export interface ReviewStayModalProps {
  isOpen: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  /** Gọi sau khi đánh giá đã được lưu thành công vào CSDL. */
  onSubmitReview: (bookingId: string, rating: number, isUpdate: boolean) => void;
  /** Gọi sau khi khách xóa đánh giá. */
  onDeleted?: (bookingId: string) => void;
}

export const ReviewStayModal: React.FC<ReviewStayModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSubmitReview,
  onDeleted,
}) => {
  const { t } = useLanguage();
  // Overall rating
  const [overallRating, setOverallRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Criteria ratings (5 categories) — được ghép vào bình luận khi gửi (Backend chỉ lưu sao + bình luận)
  const [criteriaRatings, setCriteriaRatings] = useState<CriteriaRatings>({ ...DEFAULT_CRITERIA });

  // Review comment
  const [comment, setComment] = useState('');

  // Quick tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Đánh giá đã có của booking (null = chưa đánh giá)
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset khi đổi booking, rồi tải đánh giá cũ (nếu có) để khách chỉnh sửa
  useEffect(() => {
    if (!booking || !isOpen) return;
    let alive = true;
    setOverallRating(5);
    setCriteriaRatings({ ...DEFAULT_CRITERIA });
    setComment('');
    setSelectedTags([]);
    setExistingReviewId(null);
    setSubmitError('');
    setIsSubmitting(false);
    setConfirmDelete(false);
    const bookingId = Number(booking.id);
    if (!Number.isSafeInteger(bookingId) || bookingId <= 0) return;
    setLoadingExisting(true);
    reviewApi.forBooking(bookingId)
      .then((review) => {
        if (!alive || !review) return;
        const parsed = parseReviewComment(review.comment);
        setExistingReviewId(review.reviewId);
        setOverallRating(review.rating);
        setCriteriaRatings(parsed.criteria);
        setComment(parsed.comment);
        setSelectedTags(parsed.tags);
      })
      .catch((error) => { if (alive) setSubmitError(error instanceof Error ? error.message : t('review.loadExistingFailed')); })
      .finally(() => { if (alive) setLoadingExisting(false); });
    return () => { alive = false; };
  }, [booking, isOpen]);

  // Calculate dynamic criteria average
  const averageCriteriaScore = useMemo(() => {
    const values = Object.values(criteriaRatings);
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return (sum / values.length).toFixed(1);
  }, [criteriaRatings]);

  if (!isOpen || !booking) return null;

  // Text label based on current rating
  const getRatingBadgeText = (score: number) => {
    switch (score) {
      case 5:
        return t('review.rate5');
      case 4:
        return t('review.rate4');
      case 3:
        return t('review.rate3');
      case 2:
        return t('review.rate2');
      default:
        return t('review.rate1');
    }
  };

  const getRatingSentimentIcon = (score: number) => {
    switch (score) {
      case 5:
        return 'sentiment_very_satisfied';
      case 4:
        return 'sentiment_satisfied';
      case 3:
        return 'sentiment_neutral';
      case 2:
        return 'sentiment_dissatisfied';
      default:
        return 'sentiment_very_dissatisfied';
    }
  };

  // Quick tag list
  const availableTags: string[] = REVIEW_TAGS.map(tag => tag.value);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCriteriaChange = (key: keyof typeof criteriaRatings, star: number) => {
    setCriteriaRatings((prev) => ({
      ...prev,
      [key]: star,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || loadingExisting) return;
    const bookingId = Number(booking.id);
    if (!Number.isSafeInteger(bookingId) || bookingId <= 0) { setSubmitError(t('review.invalidBooking')); return; }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const fullComment = composeReviewComment(comment, criteriaRatings, selectedTags);
      const isUpdate = existingReviewId !== null;
      if (isUpdate) await reviewApi.update(bookingId, overallRating, fullComment);
      else await reviewApi.create(bookingId, overallRating, fullComment);
      onSubmitReview(booking.id, overallRating, isUpdate);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('review.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!booking || isSubmitting) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await reviewApi.removeOwn(Number(booking.id));
      onDeleted?.(booking.id);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('review.deleteFailed'));
      setConfirmDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || overallRating;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">

      {/* Dimmed luxury overlay */}
      <div
        className="fixed inset-0 z-10 bg-on-surface/40 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* MODAL CONTAINER DIALOG */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-10 pointer-events-none">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all transform animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          {/* MODAL HEADER */}
          <div className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-surface-container-high px-6 sm:px-8 py-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary-fixed/50 px-2.5 py-0.5 rounded-full">
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  {t('review.completedStay')}
                </span>
                <span className="text-xs text-outline font-medium">
                  {t('review.code')} {booking.bookingCode}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-headline-sm text-on-surface mt-1.5 tracking-tight">
                {existingReviewId !== null ? t('review.editTitle') : t('review.newTitle')}
              </h2>
              <p className="text-secondary text-xs sm:text-sm font-body-md mt-0.5 flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-sm text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  villa
                </span>
                <span>
                  {booking.hotelName} · {booking.roomType}
                </span>
              </p>
            </div>

            {/* Close modal button */}
            <button
              aria-label={t('review.closeDialog')}
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors shadow-sm focus:outline-none cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* MODAL BODY SCROLLABLE */}
          <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-7 custom-scrollbar flex-1">
            {/* SECTION 1: OVERALL RATING */}
            <div className="bg-surface-container-low/70 rounded-2xl p-6 text-center border border-outline-variant/30 flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                {t('review.overall')}
              </p>

              {/* 5 Big Star Selector */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 my-2" id="star-selector">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentDisplayRating;
                  return (
                    <button
                      key={star}
                      aria-label={`${star} sao`}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="group focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-3xl sm:text-4xl transition-colors ${
                          isFilled ? 'text-primary-container' : 'text-surface-container-highest'
                        }`}
                        style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic highlight badge */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary-fixed/60 border border-secondary-fixed-dim/40 text-on-secondary-fixed text-xs sm:text-sm font-semibold shadow-sm">
                <span
                  className="material-symbols-outlined text-primary text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {getRatingSentimentIcon(currentDisplayRating)}
                </span>
                <span>{getRatingBadgeText(currentDisplayRating)}</span>
              </div>
            </div>

            {/* SECTION 2: DETAILED CRITERIA GRID (2 COLUMNS) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">tune</span>
                  {t('review.byCriteria')}
                </h3>
                <span className="text-xs text-outline font-medium">
                  {t('review.average')} {averageCriteriaScore} / 5.0
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Item 1: Cleanliness */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">cleaning_services</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{t('review.crit.cleanliness')}</p>
                      <p className="text-[11px] text-outline">{t('review.critHint.cleanliness')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('cleanliness', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.cleanliness
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.cleanliness ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 2: Location & Landscape */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">landscape</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{t('review.crit.location')}</p>
                      <p className="text-[11px] text-outline">{t('review.critHint.location')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('location', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.location
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.location ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 3: Service & Staff */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">room_service</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{t('review.crit.service')}</p>
                      <p className="text-[11px] text-outline">{t('review.critHint.service')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('service', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.service
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.service ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 4: Facilities & Villa */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">pool</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{t('review.crit.facilities')}</p>
                      <p className="text-[11px] text-outline">{t('review.critHint.facilities')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('facilities', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.facilities
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.facilities ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 5: Value for money */}
                <div className="sm:col-span-2 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">loyalty</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{t('review.crit.value')}</p>
                      <p className="text-[11px] text-outline">
                        {t('review.critHint.value')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('value', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.value
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.value ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: DETAILED REVIEW TEXTAREA & QUICK TAGS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5"
                  htmlFor="review-content"
                >
                  <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                  {t('review.share')}
                </label>
                <span className="text-[11px] text-outline" id="char-count">
                  {t('review.chars', { count: comment.length })}
                </span>
              </div>

              {/* Quick tag suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`text-[11px] font-medium px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-secondary-fixed/40 text-on-secondary-fixed border border-secondary-fixed-dim/60 font-semibold'
                          : 'bg-surface-container hover:bg-secondary-fixed/50 hover:text-on-secondary-fixed text-on-surface-variant border border-outline-variant/40'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-xs text-primary"
                        style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {isSelected ? 'check' : 'add'}
                      </span>
                      <span>{t((tagLabelKey(tag) ?? 'review.tag.quiet') as TranslationKey)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  id="review-content"
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('review.placeholder')}
                  className="w-full rounded-2xl border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary p-4 text-on-surface bg-surface-container-low/40 text-xs sm:text-sm placeholder:text-outline/70 leading-relaxed transition resize-none outline-none"
                />
              </div>
            </div>

            {loadingExisting && (
              <p role="status" className="text-xs text-on-surface-variant">{t('review.loadingExisting')}</p>
            )}
            {submitError && (
              <p role="alert" className="rounded-xl bg-error-container p-3 text-xs sm:text-sm text-on-error-container">{submitError}</p>
            )}
          </div>

          {/* MODAL STICKY FOOTER ACTIONS */}
          <div className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-sm border-t border-surface-container-high px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-outline text-center sm:text-left hidden sm:flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-xs text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
              {t('review.moderationNote')}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {existingReviewId !== null && onDeleted && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isSubmitting}
                  className={`shrink-0 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 ${confirmDelete ? 'bg-error text-on-error' : 'text-error hover:bg-error-container/50'}`}
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  {confirmDelete ? t('review.deleteConfirm') : t('review.delete')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors focus:outline-none cursor-pointer"
              >
                {t('review.later')}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || loadingExisting}
                className="w-1/2 sm:w-auto px-7 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/95 text-on-primary shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    <span>{t('review.sending')}</span>
                  </>
                ) : (
                  <>
                    <span>{existingReviewId !== null ? t('review.update') : t('review.submit')}</span>
                    <span className="material-symbols-outlined text-base">send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewStayModal;
