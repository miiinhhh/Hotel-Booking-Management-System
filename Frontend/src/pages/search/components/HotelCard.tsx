import React, { useState } from 'react';
import { Hotel } from '../types';

interface HotelCardProps {
  hotel: Hotel;
  onSelect?: (hotel: Hotel) => void;
  onFavoriteToggle?: (hotelId: string, isFav: boolean) => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  onSelect,
  onFavoriteToggle,
}) => {
  const [isFavorite, setIsFavorite] = useState(hotel.isFavorite ?? false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    onFavoriteToggle?.(hotel.id, nextState);
  };

  return (
    <article
      onClick={() => onSelect?.(hotel)}
      className="bg-surface-container-lowest rounded-lg p-space-sm hover:shadow-[0_12px_32px_-4px_rgba(120,53,15,0.08)] transition-all flex flex-col md:flex-row gap-space-md group cursor-pointer border border-transparent hover:border-surface-container"
    >
      {/* Image Container */}
      <div className="relative w-full md:w-[320px] lg:w-[340px] h-64 md:h-auto rounded-[1.5rem] overflow-hidden shrink-0">
        <img
          src={hotel.image}
          alt={hotel.imageAlt || hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />

        {/* Badge Tag */}
        {hotel.badge && (
          <div className="absolute top-3 left-3">
            <span
              className={`px-3 py-1 rounded-full font-label-sm text-label-sm tracking-wide font-semibold shadow-sm backdrop-blur-md ${
                hotel.badgeVariant === 'primary'
                  ? 'bg-primary-container/95 text-on-primary'
                  : 'bg-surface-container-lowest/90 text-on-surface'
              }`}
            >
              {hotel.badge}
            </span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          aria-label="Lưu vào danh sách yêu thích"
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-colors border-0 cursor-pointer ${
            isFavorite
              ? 'bg-surface-container-lowest/90 text-primary shadow-sm'
              : 'bg-surface-container-lowest/80 text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            favorite
          </span>
        </button>
      </div>

      {/* Middle & Right Content Split */}
      <div className="flex flex-col justify-between flex-grow p-space-xs">
        <div className="flex flex-col gap-space-xs">
          {/* Location & Star Ratings */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[16px]">
                pin_drop
              </span>
              <span className="font-label-md text-label-md">{hotel.location}</span>
              {hotel.distanceInfo && (
                <>
                  <span className="text-outline">·</span>
                  <span className="font-label-sm text-label-sm text-outline">
                    {hotel.distanceInfo}
                  </span>
                </>
              )}
            </div>

            {/* Stars */}
            <div className="flex items-center gap-0.5 text-secondary-container">
              {Array.from({ length: hotel.starRating }).map((_, idx) => (
                <span
                  key={idx}
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
          </div>

          {/* Hotel Name */}
          <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">
            {hotel.name}
          </h3>

          {/* Amenity Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hotel.amenities.map((item, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 ${
                  item.isHighlight
                    ? 'bg-primary-fixed text-on-primary-fixed font-medium'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    item.isHighlight ? '' : 'text-primary'
                  }`}
                >
                  {item.icon}
                </span>
                {item.text}
              </span>
            ))}
          </div>
        </div>

        {/* Representative Room & Pricing CTA Row */}
        <div className="pt-space-md mt-space-sm flex flex-col sm:flex-row items-start sm:items-end justify-between gap-space-sm border-t border-surface-container/60 sm:border-0">
          {/* Room Details & Rating */}
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Hạng phòng nổi bật
            </span>
            <span className="font-body-md text-body-md font-medium text-on-surface">
              {hotel.featuredRoomType}
            </span>
            <div className="flex items-center gap-space-xs mt-1">
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold">
                {hotel.ratingScore.toFixed(1)}
              </span>
              <span className="font-label-sm text-label-sm text-primary font-semibold">
                {hotel.ratingText}
              </span>
              <span className="font-label-sm text-label-sm text-outline">
                ({hotel.reviewCount.toLocaleString('vi-VN')} đánh giá)
              </span>
            </div>
          </div>

          {/* Pricing & Button CTA */}
          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
            <div className="flex items-baseline gap-space-xs">
              {hotel.originalPrice && (
                <span className="font-label-md text-label-md text-outline line-through">
                  {hotel.originalPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
              <span
                className={`font-headline-sm text-headline-sm font-bold ${
                  hotel.originalPrice ? 'text-primary' : 'text-on-surface'
                }`}
              >
                {hotel.pricePerNight.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-outline-variant mb-space-xs">
              / đêm · Đã bao gồm thuế & phí
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(hotel);
              }}
              className="w-full sm:w-auto px-space-lg py-2.5 rounded-full bg-primary-container hover:bg-tertiary-container text-on-primary font-label-lg text-label-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-space-xs cursor-pointer border-0 active:scale-95"
            >
              <span>Xem phòng</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
export default HotelCard;
