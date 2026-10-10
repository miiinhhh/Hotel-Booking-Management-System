import React from 'react';

interface HotelShowcaseProps {
  name: string;
  categoryTag?: string;
  starRating?: number;
  address?: string;
  distanceToBeach?: string;
  ratingScore?: number;
  ratingText?: string;
  reviewCount?: number;
  onOpenMap?: () => void;
}

export const HotelShowcase: React.FC<HotelShowcaseProps> = ({
  name,
  categoryTag = 'Khu Nghỉ Dưỡng Sanctuary',
  starRating = 5,
  address = 'Bãi Bắc, Bán đảo Sơn Trà, TP. Đà Nẵng',
  distanceToBeach = 'Cách biển riêng 50m',
  ratingScore = 9.6,
  ratingText = 'Xuất sắc',
  reviewCount = 1420,
  onOpenMap,
}) => {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm tracking-widest uppercase font-semibold">
            {categoryTag}
          </span>
          <div
            className="flex items-center text-primary-container"
            title={`Tiêu chuẩn ${starRating} sao`}
          >
            {Array.from({ length: starRating }).map((_, idx) => (
              <span
                key={idx}
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            ))}
          </div>
        </div>

        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
          {name}
        </h1>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-on-surface-variant font-body-md text-body-md mt-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[19px]">
              location_on
            </span>
            <span>{address}</span>
          </div>

          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant hidden sm:inline-block"></span>

          <span className="text-tertiary font-medium">{distanceToBeach}</span>

          <button
            type="button"
            onClick={onOpenMap}
            className="flex items-center gap-1 text-primary hover:text-tertiary-container font-label-md text-label-md font-semibold underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors cursor-pointer border-0 bg-transparent p-0"
          >
            Xem trên bản đồ
            <span className="material-symbols-outlined text-[16px]">map</span>
          </button>
        </div>
      </div>

      {/* Rating badge */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-lowest shadow-sm self-start md:self-auto shrink-0">
        <div className="flex flex-col text-right">
          <span className="font-headline-sm text-headline-sm text-on-surface leading-tight font-bold">
            {ratingText}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {reviewCount.toLocaleString('vi-VN')} đánh giá thực tế
          </span>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold shadow-md shadow-primary/20">
          {ratingScore.toFixed(1)}
        </div>
      </div>
    </header>
  );
};
export default HotelShowcase;
