import React, { useState } from 'react';

interface BreadcrumbHeaderProps {
  hotelName: string;
  onNavigateHome?: () => void;
  onNavigateSearch?: () => void;
  isInitiallyFavorited?: boolean;
}

export const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({
  hotelName,
  onNavigateHome,
  onNavigateSearch,
  isInitiallyFavorited = false,
}) => {
  const [isFavorited, setIsFavorited] = useState(isInitiallyFavorited);
  const [shareText, setShareText] = useState('Chia sẻ');

  const handleFavoriteClick = () => {
    setIsFavorited(!isFavorited);
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${hotelName} - StayLuxe`,
          text: `Khám phá khu nghỉ dưỡng tuyệt tác tại Đà Nẵng trên StayLuxe`,
          url: window.location.href,
        });
      } catch {
        // Canceled share
      }
    } else {
      // Copy URL fallback
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareText('Đã sao chép link!');
        setTimeout(() => {
          setShareText('Chia sẻ');
        }, 2000);
      } catch {
        setShareText('Đã sao chép!');
        setTimeout(() => {
          setShareText('Chia sẻ');
        }, 2000);
      }
    }
  };

  return (
    <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-xs">
      {/* Breadcrumb links */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-2 text-on-surface-variant font-body-md text-body-md"
      >
        <button
          type="button"
          onClick={onNavigateHome}
          className="hover:text-primary transition-colors cursor-pointer border-0 bg-transparent p-0 text-inherit font-inherit"
        >
          Trang chủ
        </button>
        <span className="material-symbols-outlined text-outline-variant text-[16px]">
          chevron_right
        </span>
        <button
          type="button"
          onClick={onNavigateSearch}
          className="hover:text-primary transition-colors cursor-pointer border-0 bg-transparent p-0 text-inherit font-inherit"
        >
          Đà Nẵng
        </button>
        <span className="material-symbols-outlined text-outline-variant text-[16px]">
          chevron_right
        </span>
        <span className="hover:text-primary transition-colors cursor-pointer">
          Bán đảo Sơn Trà
        </span>
        <span className="material-symbols-outlined text-outline-variant text-[16px]">
          chevron_right
        </span>
        <span className="text-on-surface font-semibold truncate max-w-[240px] md:max-w-md">
          {hotelName}
        </span>
      </nav>

      {/* Action Buttons: Share & Favorite */}
      <div className="flex items-center gap-space-xs self-end sm:self-auto">
        {onNavigateSearch && (
          <button
            type="button"
            onClick={onNavigateSearch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high transition-all text-on-surface font-label-md text-label-md cursor-pointer border-0 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span>DS Khách sạn</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleShareClick}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all text-on-surface-variant hover:text-primary active:scale-95 cursor-pointer border-0"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          <span className="font-label-md text-label-md">{shareText}</span>
        </button>

        <button
          type="button"
          onClick={handleFavoriteClick}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all text-on-surface-variant hover:text-primary active:scale-95 group cursor-pointer border-0"
        >
          <span
            className={`material-symbols-outlined text-[18px] transition-colors ${
              isFavorited
                ? 'text-primary'
                : 'group-hover:text-primary text-secondary'
            }`}
            style={{ fontVariationSettings: isFavorited ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isFavorited ? 'favorite' : 'favorite_border'}
          </span>
          <span className="font-label-md text-label-md">
            {isFavorited ? 'Đã lưu yêu thích' : 'Lưu yêu thích'}
          </span>
        </button>
      </div>
    </section>
  );
};
export default BreadcrumbHeader;
