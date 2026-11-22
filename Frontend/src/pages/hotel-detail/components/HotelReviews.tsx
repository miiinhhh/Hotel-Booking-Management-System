import React, { useEffect, useState } from 'react';
import { reviewApi, HotelRatingDto, PublicReviewDto } from '../../../services/reviewApi';
import { parseReviewComment, tagLabelKey, CRITERIA_LABELS, CriteriaKey } from '../../booking-history/reviewFormat';
import { useLanguage, ratingLabelKey, TranslationKey } from '../../../i18n/LanguageContext';

const PAGE_SIZE = 5;

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 16 }) => (
  <span className="flex text-amber-500" aria-label={`${value}/5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className="material-symbols-outlined" style={{ fontSize: size, fontVariationSettings: `'FILL' ${i < value ? 1 : 0}` }}>star</span>
    ))}
  </span>
);

/** Đánh giá công khai của khách sạn: điểm trung bình, phân bố sao và danh sách bình luận đã được duyệt. */
export const HotelReviews: React.FC<{ hotelId: number }> = ({ hotelId }) => {
  const { t, locale } = useLanguage();
  const [rating, setRating] = useState<HotelRatingDto | null>(null);
  const [items, setItems] = useState<PublicReviewDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setItems([]); setPage(1);
    Promise.all([reviewApi.hotelRating(hotelId), reviewApi.publicList(hotelId, 1, PAGE_SIZE)])
      .then(([r, list]) => { if (!alive) return; setRating(r); setItems(list.items); setTotal(list.total); })
      .catch(() => { if (alive) setError(t('reviewsPub.loadFailed')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [hotelId, t]);

  const loadMore = async () => {
    const next = page + 1;
    setLoading(true);
    try {
      const list = await reviewApi.publicList(hotelId, next, PAGE_SIZE);
      setItems(prev => [...prev, ...list.items]); setTotal(list.total); setPage(next);
    } catch { setError(t('reviewsPub.loadFailed')); }
    finally { setLoading(false); }
  };

  const average = rating?.averageRating ?? 0;
  const count = rating?.totalReviews ?? 0;
  const maxBucket = Math.max(1, ...(rating?.distribution.map(d => d.count) ?? [0]));

  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-2xl font-semibold text-on-surface">{t('reviewsPub.title')}</h2>

      {error && <p role="alert" className="mt-4 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}

      {!error && !loading && count === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">{t('reviewsPub.empty')}</p>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Tổng quan điểm */}
          <div className="h-fit rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded rounded-bl-none bg-primary text-xl font-bold text-on-primary">{average ? average.toFixed(1) : '—'}</span>
              <span className="leading-tight">
                <span className="block font-semibold text-on-surface">{t(ratingLabelKey(average))}</span>
                <span className="block text-xs text-on-surface-variant">{t('rating.reviews', { count: count.toLocaleString(locale) })}</span>
              </span>
            </div>
            <ul className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const n = rating?.distribution.find(d => d.rating === star)?.count ?? 0;
                return (
                  <li key={star} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="w-10 shrink-0">{t('reviewsPub.stars', { count: star })}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                      <span className="block h-full rounded-full bg-amber-500" style={{ width: `${(n / maxBucket) * 100}%` }} />
                    </span>
                    <span className="w-6 shrink-0 text-right">{n}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[11px] text-on-surface-variant">{t('reviewsPub.basedOn', { count })}</p>
          </div>

          {/* Danh sách bình luận */}
          <div className="space-y-3">
            {items.map(r => {
              const parsed = parseReviewComment(r.comment);
              return (
                <article key={r.reviewId} className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-sm font-bold text-primary">
                        {(r.reviewerName || t('reviewsPub.guest')).charAt(0).toUpperCase()}
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-semibold text-on-surface">{r.reviewerName || t('reviewsPub.guest')}</span>
                        <span className="block text-xs text-on-surface-variant">{new Date(r.createdAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </span>
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  <p className={`mt-3 whitespace-pre-line text-sm leading-6 ${parsed.comment ? 'text-on-surface' : 'italic text-on-surface-variant'}`}>
                    {parsed.comment || t('reviewsPub.noComment')}
                  </p>
                  {(parsed.tags.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {parsed.tags.map(tag => {
                        const key = tagLabelKey(tag);
                        return <span key={tag} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">{key ? t(key as TranslationKey) : tag}</span>;
                      })}
                    </div>
                  )}
                  <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                    {(Object.keys(CRITERIA_LABELS) as CriteriaKey[]).map(k => (
                      <span key={k}>{t(`review.crit.${k}` as TranslationKey)} <strong className="text-on-surface">{parsed.criteria[k]}</strong>/5</span>
                    ))}
                  </p>
                </article>
              );
            })}
            {loading && <div className="h-28 animate-pulse rounded-2xl bg-surface-container" aria-hidden="true" />}
            {!loading && items.length < total && (
              <button type="button" onClick={() => void loadMore()} className="w-full rounded-full border border-outline-variant py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
                {t('reviewsPub.more')} ({total - items.length})
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
export default HotelReviews;
