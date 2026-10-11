import React from 'react';
import { BookingStats } from '../types';

interface BookingStatsRowProps {
  stats: BookingStats;
}

export const BookingStatsRow: React.FC<BookingStatsRowProps> = ({ stats }) => {
  return (
    <div className="flex flex-col gap-space-xs">
      {/* Editorial Title & Status Summary Bento Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-2">
        <div className="max-w-2xl">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            Hồ sơ lưu trú cao cấp
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Quản lý &amp; Lịch sử đặt phòng
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Xem vé điện tử, mã QR check-in nhanh và quản lý trọn vẹn toàn bộ các kỳ nghỉ dưỡng của bạn.
          </p>
        </div>

        {/* User Status Stats Pill Grid */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Stat 1: Upcoming */}
          <div className="bg-surface-container-lowest px-5 py-3.5 rounded-full shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-[16px] leading-tight text-on-surface">
                {String(stats.upcomingCount).padStart(2, '0')} Chuyến đi
              </span>
              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                Sắp diễn ra
              </span>
            </div>
          </div>

          {/* Stat 2: Completed */}
          <div className="bg-surface-container-lowest px-5 py-3.5 rounded-full shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-[16px] leading-tight text-on-surface">
                {String(stats.completedCount).padStart(2, '0')} Kỳ nghỉ
              </span>
              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                Đã hoàn tất
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
