import React from 'react';
import { BookingTab, BookingStats } from '../types';

interface BookingTabsProps {
  activeTab: BookingTab;
  onTabChange: (tab: BookingTab) => void;
  stats: BookingStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export const BookingTabs: React.FC<BookingTabsProps> = ({
  activeTab,
  onTabChange,
  stats,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
      {/* Status Tabs (Pill Navigation with Counters) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none" id="booking-tabs">
        {/* Tab 1: Upcoming */}
        <button
          onClick={() => onTabChange('upcoming')}
          className={`px-5 py-2.5 rounded-full font-label-lg text-label-lg flex items-center gap-2.5 transition-all ${
            activeTab === 'upcoming'
              ? 'bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(194,65,12,0.2)]'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>Sắp tới (Upcoming)</span>
          <span
            className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
              activeTab === 'upcoming'
                ? 'bg-on-primary text-primary-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {stats.upcomingCount}
          </span>
        </button>

        {/* Tab 2: Completed */}
        <button
          onClick={() => onTabChange('completed')}
          className={`px-5 py-2.5 rounded-full font-label-lg text-label-lg flex items-center gap-2.5 transition-all ${
            activeTab === 'completed'
              ? 'bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(194,65,12,0.2)]'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>Hoàn tất (Completed)</span>
          <span
            className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] ${
              activeTab === 'completed'
                ? 'bg-on-primary text-primary-container font-bold'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {stats.completedCount}
          </span>
        </button>

        {/* Tab 3: Cancelled */}
        <button
          onClick={() => onTabChange('cancelled')}
          className={`px-5 py-2.5 rounded-full font-label-lg text-label-lg flex items-center gap-2.5 transition-all ${
            activeTab === 'cancelled'
              ? 'bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(194,65,12,0.2)]'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>Đã hủy (Cancelled)</span>
          <span
            className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] ${
              activeTab === 'cancelled'
                ? 'bg-on-primary text-primary-container font-bold'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {stats.cancelledCount}
          </span>
        </button>
      </div>

      {/* Search & Sorting Controls */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-80">
          <span className="material-symbols-outlined text-outline absolute left-4 top-1/2 -translate-y-1/2 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-lowest text-body-md text-on-surface pl-11 pr-4 py-2.5 rounded-full shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] outline-none focus:ring-2 focus:ring-primary-container/20 transition-all placeholder:text-outline"
            placeholder="Tìm theo mã đơn hoặc tên resort..."
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Time Filter Select */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none bg-surface-container-lowest pl-9 pr-8 py-2.5 rounded-full shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors outline-none cursor-pointer"
          >
            <option value="recent">Gần đây nhất</option>
            <option value="checkin-asc">Ngày nhận phòng tăng dần</option>
            <option value="price-desc">Tổng tiền cao nhất</option>
          </select>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
            calendar_today
          </span>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
            expand_more
          </span>
        </div>
      </div>
    </div>
  );
};
