import React from 'react';
import { Hotel } from '../types';
import { useLanguage, formatMoney, ratingLabelKey } from '../../../i18n/LanguageContext';

interface HotelCardProps {
  hotel: Hotel;
  onSelect?: (hotel: Hotel) => void;
  onFavoriteToggle?: (hotelId: string, isFav: boolean) => void;
  /** Ẩn nút trái tim khi tài khoản không có quyền dùng danh sách yêu thích. */
  showFavorite?: boolean;
}

/** Thẻ kết quả ngang: ảnh · thông tin · giá & nút xem phòng (bố cục quen thuộc của các trang đặt phòng). */
export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onSelect, onFavoriteToggle, showFavorite = true }) => {
  const { t, locale } = useLanguage();
  const isFavorite = hotel.isFavorite ?? false;
  const hasRating = hotel.reviewCount > 0;

  return (
    <article onClick={() => onSelect?.(hotel)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md sm:flex-row">
      {/* Ảnh */}
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-surface-container sm:aspect-auto sm:w-72">
        <img src={hotel.image} alt={hotel.imageAlt || hotel.name} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {showFavorite && (
          <button type="button" aria-label={t('search.saveToWishlist')} aria-pressed={isFavorite}
            onClick={(e) => { e.stopPropagation(); onFavoriteToggle?.(hotel.id, !isFavorite); }}
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/95 shadow-sm transition-colors ${isFavorite ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[18px]" style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>favorite</span>
          </button>
        )}
      </div>

      {/* Thông tin */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-snug text-on-surface group-hover:text-primary">{hotel.name}</h3>
          {hasRating && (
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-right leading-tight">
                <span className="block text-sm font-semibold text-on-surface">{t(ratingLabelKey(hotel.ratingScore))}</span>
                <span className="block text-xs text-on-surface-variant">{t('rating.reviews', { count: hotel.reviewCount.toLocaleString(locale) })}</span>
              </span>
              <span className="flex h-9 min-w-9 items-center justify-center rounded rounded-bl-none bg-primary px-2 text-sm font-bold text-on-primary">{hotel.ratingScore.toFixed(1)}</span>
            </span>
          )}
        </div>
        <p className="flex items-center gap-1 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary">location_on</span><span className="truncate">{hotel.location}</span>
        </p>
        {hotel.featuredRoomType && (
          <p className="text-sm text-on-surface"><span className="text-on-surface-variant">{t('search.featuredRoom')}:</span> <span className="font-medium">{hotel.featuredRoomType}</span></p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {hotel.availableRooms != null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${hotel.availableRooms <= 3 ? 'bg-error-container/60 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
              <span className="material-symbols-outlined text-[14px]">bed</span>{t('search.roomsAvailable', { count: hotel.availableRooms })}
            </span>
          )}
          {hotel.amenities.map((item) => (
            <span key={item.text} className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-primary">{item.icon}</span>{item.text}
            </span>
          ))}
        </div>
      </div>

      {/* Giá */}
      <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-outline-variant/30 p-5 sm:w-52 sm:flex-col sm:items-end sm:justify-end sm:border-l sm:border-t-0">
        <div className="sm:text-right">
          <p className="text-xs text-on-surface-variant">{t('search.nightFrom')}</p>
          {hotel.originalPrice && <p className="text-sm text-outline line-through">{formatMoney(hotel.originalPrice, locale)}</p>}
          <p className="text-2xl font-bold tracking-tight text-on-surface">{formatMoney(hotel.pricePerNight, locale)}</p>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onSelect?.(hotel); }}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90">
          {t('search.viewRooms')}<span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </article>
  );
};
export default HotelCard;
