import React from 'react';
import { useLanguage, ratingLabelKey } from '../../../i18n/LanguageContext';

interface HotelShowcaseProps {
  name: string;
  starRating?: number;
  address?: string;
  ratingScore?: number;
  reviewCount?: number;
  onOpenMap?: () => void;
}

/** Tiêu đề khách sạn: tên, địa chỉ và điểm đánh giá thật (ẩn khi chưa có đánh giá). */
export const HotelShowcase: React.FC<HotelShowcaseProps> = ({ name, starRating = 0, address = '', ratingScore = 0, reviewCount = 0, onOpenMap }) => {
  const { t, locale } = useLanguage();
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('detail.category')}</span>
          {starRating > 0 && (
            <span className="flex text-amber-500" title={t('detail.stars', { count: starRating })}>
              {Array.from({ length: starRating }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              ))}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">{name}</h1>
        {address && (
          <p className="mt-2 flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[19px] text-primary">location_on</span>{address}
            {onOpenMap && (
              <button type="button" onClick={onOpenMap} className="ml-2 text-sm font-semibold text-primary underline underline-offset-4">{t('detail.viewMap')}</button>
            )}
          </p>
        )}
      </div>

      {reviewCount > 0 && (
        <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl bg-surface-container-lowest p-3 pr-4 shadow-sm md:self-auto">
          <span className="flex h-12 w-12 items-center justify-center rounded rounded-bl-none bg-primary text-lg font-bold text-on-primary">{ratingScore.toFixed(1)}</span>
          <span className="leading-tight">
            <span className="block font-semibold text-on-surface">{t(ratingLabelKey(ratingScore))}</span>
            <span className="block text-xs text-on-surface-variant">{t('rating.realReviews', { count: reviewCount.toLocaleString(locale) })}</span>
          </span>
        </div>
      )}
    </header>
  );
};
export default HotelShowcase;
