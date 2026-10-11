import React from 'react';
import { SortOption } from '../types';

interface SearchSummaryBarProps {
  location?: string;
  dates?: string;
  duration?: string;
  guests?: string;
  totalResults?: number;
  currentSort?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  onEditSearch?: () => void;
  onNavigateHome?: () => void;
}

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'popularity', label: 'Độ phổ biến' },
  { id: 'rating', label: 'Đánh giá cao nhất' },
  { id: 'price_asc', label: 'Giá tăng dần' },
  { id: 'price_desc', label: 'Giá giảm dần' },
  { id: 'best_deal', label: 'Ưu đãi tốt nhất' },
];

export const SearchSummaryBar: React.FC<SearchSummaryBarProps> = ({
  location = 'Đà Nẵng, Việt Nam',
  dates = '15 Th04 – 18 Th04',
  duration = '3 đêm',
  guests = '2 người lớn · 1 phòng',
  totalResults = 142,
  currentSort = 'popularity',
  onSortChange,
  onEditSearch,
  onNavigateHome,
}) => {
  return (
    <section className="w-full bg-surface-container-low/70 py-space-md border-b border-surface-container">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex flex-col gap-space-md">
        {onNavigateHome && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md text-sm">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-primary transition-colors cursor-pointer border-0 bg-transparent p-0 text-inherit font-inherit"
            >
              Trang chủ
            </button>
            <span className="material-symbols-outlined text-outline-variant text-[16px]">chevron_right</span>
            <span className="text-on-surface font-semibold">Kết quả tìm kiếm</span>
          </nav>
        )}
        {/* Search Summary Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-lowest p-space-xs md:p-space-sm pl-space-md rounded-full shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)]">
          <div className="flex flex-wrap items-center gap-space-sm md:gap-space-md">
            {/* Location */}
            <div className="flex items-center gap-space-xs text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px]">
                location_on
              </span>
              <span className="font-label-lg text-label-lg font-semibold">
                {location}
              </span>
            </div>

            <span className="text-surface-container-highest">/</span>

            {/* Dates */}
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">
                calendar_month
              </span>
              <span className="font-body-md text-body-md">
                {dates}{' '}
                <span className="text-label-sm text-outline font-medium">
                  ({duration})
                </span>
              </span>
            </div>

            <span className="text-surface-container-highest hidden sm:inline">
              /
            </span>

            {/* Guests */}
            <div className="flex items-center gap-space-xs text-on-surface-variant hidden sm:flex">
              <span className="material-symbols-outlined text-[18px]">
                group
              </span>
              <span className="font-body-md text-body-md">{guests}</span>
            </div>
          </div>

          {/* Edit Search Button */}
          <button
            type="button"
            onClick={onEditSearch}
            className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md px-space-md py-2 rounded-full transition-colors cursor-pointer border-0 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Result Count & Quick Sort Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pt-space-xs">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">
              Khám phá chốn dừng chân
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mt-0.5">
              Tìm thấy {totalResults} khách sạn tại {location.split(',')[0]}
            </h1>
          </div>

          {/* Horizontal Quick Filter Pills */}
          <div
            className="flex items-center gap-space-xs overflow-x-auto pb-1 scrollbar-none"
            id="sort-filters"
          >
            {SORT_OPTIONS.map((opt) => {
              const isActive = currentSort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSortChange?.(opt.id)}
                  className={`sort-chip whitespace-nowrap px-space-md py-2 rounded-full font-label-md text-label-md font-medium transition-all cursor-pointer border-0 ${
                    isActive
                      ? 'bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(194,65,12,0.2)]'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
export default SearchSummaryBar;
