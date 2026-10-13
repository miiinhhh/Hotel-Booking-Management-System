import React from 'react';
import { StaffMetricsData } from '../types';

interface StaffMetricsProps {
  metrics: StaffMetricsData;
}

export const StaffMetrics: React.FC<StaffMetricsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Metric 1: Tổng đơn hôm nay */}
      <div className="bg-surface-container-lowest rounded-DEFAULT p-5 shadow-[0_4px_20px_-2px_rgba(120,53,15,0.03)] border border-[#eae8e5] flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
              Tổng đơn hôm nay
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="font-headline-md text-[32px] text-on-surface font-bold leading-none">
                {metrics.totalToday}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                đơn
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0 border border-[#eae8e5]">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#f5f3f0] flex items-center gap-1.5">
          <span className="inline-flex items-center text-label-sm text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
            +{metrics.totalChangePercent}%
          </span>
          <span className="font-label-sm text-[12px] text-on-surface-variant">so với hôm qua</span>
        </div>
      </div>

      {/* Metric 2: Chờ xác nhận cọc */}
      <div className="bg-surface-container-lowest rounded-DEFAULT p-5 shadow-[0_4px_20px_-2px_rgba(120,53,15,0.03)] border border-[#eae8e5] flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
              Chờ xác nhận cọc
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="font-headline-md text-[32px] text-primary-container font-bold leading-none">
                {String(metrics.pendingDepositCount).padStart(2, '0')}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                đơn
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 shrink-0 border border-amber-200/50">
            <span className="material-symbols-outlined text-[20px]">pending_actions</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#f5f3f0] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <span className="font-label-sm text-[12px] text-amber-800 font-semibold">
            Cần xử lý gấp trước 12:00
          </span>
        </div>
      </div>

      {/* Metric 3: Check-in hôm nay */}
      <div className="bg-surface-container-lowest rounded-DEFAULT p-5 shadow-[0_4px_20px_-2px_rgba(120,53,15,0.03)] border border-[#eae8e5] flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
              Check-in hôm nay
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="font-headline-md text-[32px] text-on-surface font-bold leading-none">
                {metrics.checkInTodayCount}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                phòng
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0 border border-[#eae8e5]">
            <span className="material-symbols-outlined text-[20px]">login</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#f5f3f0] flex items-center justify-between text-label-sm text-[12px] font-medium text-on-surface-variant">
          <span className="text-emerald-700 font-semibold">
            Đã vào: {metrics.checkInCompletedCount}
          </span>
          <span className="text-outline-variant">•</span>
          <span className="text-on-surface font-semibold">
            Còn lại: {String(metrics.checkInRemainingCount).padStart(2, '0')} phòng
          </span>
        </div>
      </div>

      {/* Metric 4: Check-out hôm nay */}
      <div className="bg-surface-container-lowest rounded-DEFAULT p-5 shadow-[0_4px_20px_-2px_rgba(120,53,15,0.03)] border border-[#eae8e5] flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
              Check-out hôm nay
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="font-headline-md text-[32px] text-on-surface font-bold leading-none">
                {metrics.checkOutTodayCount}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                phòng
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0 border border-[#eae8e5]">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#f5f3f0] flex items-center justify-between text-label-sm text-[12px] font-medium text-on-surface-variant">
          <span className="text-primary font-semibold">
            Đã hoàn tất: {metrics.checkOutCompletedCount}
          </span>
          <span className="text-outline-variant">•</span>
          <span className="text-amber-800">
            Chờ chìa khóa: {String(metrics.checkOutPendingKeyCount).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};
