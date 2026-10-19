import React from 'react';
import { CustomerCRMStats } from '../types';

interface StaffCustomerMetricsProps {
  stats: CustomerCRMStats;
}

export const StaffCustomerMetrics: React.FC<StaffCustomerMetricsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* KPI 1 */}
      <div className="bg-surface-container-lowest p-4 rounded-DEFAULT shadow-sm flex items-center justify-between border border-[#eae8e5]">
        <div>
          <div className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
            Tỷ lệ khách quay lại
          </div>
          <div className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
            {stats.returnRatePercent}%
          </div>
          <div className="text-[11px] text-emerald-700 font-label-sm">{stats.returnRateTrend}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">repeat</span>
        </div>
      </div>

      {/* KPI 2 */}
      <div className="bg-surface-container-lowest p-4 rounded-DEFAULT shadow-sm flex items-center justify-between border border-[#eae8e5]">
        <div>
          <div className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
            Chi tiêu bình quân (ADR)
          </div>
          <div className="font-headline-sm text-headline-sm text-primary font-bold mt-0.5">
            {stats.adrAmount}
          </div>
          <div className="text-[11px] text-on-surface-variant font-label-sm">{stats.adrSegment}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">payments</span>
        </div>
      </div>

      {/* KPI 3 */}
      <div className="bg-surface-container-lowest p-4 rounded-DEFAULT shadow-sm flex items-center justify-between border border-[#eae8e5]">
        <div>
          <div className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
            Hồ sơ đã chuẩn hóa CCCD
          </div>
          <div className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
            {stats.verifiedCccdPercent}%
          </div>
          <div className="text-[11px] text-secondary font-label-sm">{stats.verifiedCccdNote}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">verified_user</span>
        </div>
      </div>
    </div>
  );
};
