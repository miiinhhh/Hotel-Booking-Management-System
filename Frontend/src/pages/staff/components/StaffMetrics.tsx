import React from 'react';
import { StaffMetricsData } from '../types';

interface StaffMetricsProps {
  metrics: StaffMetricsData;
  loading?: boolean;
}

/** Bốn chỉ số vận hành trong ngày. Chỉ hiển thị số liệu thật từ máy chủ, không có chữ cố định. */
export const StaffMetrics: React.FC<StaffMetricsProps> = ({ metrics, loading }) => {
  const change = metrics.totalChangePercent;
  const items: { icon: string; label: string; value: number; unit: string; foot: React.ReactNode; highlight?: boolean }[] = [
    {
      icon: 'calendar_month', label: 'Đơn hôm nay', value: metrics.totalToday, unit: 'đơn',
      foot: change === 0
        ? <span className="text-on-surface-variant">Bằng hôm qua</span>
        : <span className={`inline-flex items-center gap-0.5 font-semibold ${change > 0 ? 'text-emerald-700' : 'text-error'}`}>
            <span className="material-symbols-outlined text-[14px]">{change > 0 ? 'arrow_upward' : 'arrow_downward'}</span>
            {Math.abs(change)}% <span className="font-normal text-on-surface-variant">so với hôm qua</span>
          </span>,
    },
    {
      icon: 'pending_actions', label: 'Chờ xác nhận', value: metrics.pendingDepositCount, unit: 'đơn',
      highlight: metrics.pendingDepositCount > 0,
      foot: metrics.pendingDepositCount > 0
        ? <span className="font-medium text-amber-800">Cần xác nhận hoặc thu cọc</span>
        : <span className="text-on-surface-variant">Không có đơn chờ</span>,
    },
    {
      icon: 'login', label: 'Check-in hôm nay', value: metrics.checkInTodayCount, unit: 'phòng',
      foot: <span className="text-on-surface-variant"><b className="text-emerald-700">{metrics.checkInCompletedCount}</b> đã nhận · <b className="text-on-surface">{metrics.checkInRemainingCount}</b> còn lại</span>,
    },
    {
      icon: 'logout', label: 'Check-out hôm nay', value: metrics.checkOutTodayCount, unit: 'phòng',
      foot: <span className="text-on-surface-variant"><b className="text-emerald-700">{metrics.checkOutCompletedCount}</b> đã trả · <b className="text-on-surface">{metrics.checkOutPendingKeyCount}</b> chờ trả phòng</span>,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Chỉ số hôm nay">
      {items.map(item => (
        <article key={item.label} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
            <span className={`material-symbols-outlined text-[16px] ${item.highlight ? 'text-amber-700' : 'text-primary'}`}>{item.icon}</span>
            {item.label}
          </p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold leading-none tracking-tight ${item.highlight ? 'text-amber-800' : 'text-on-surface'}`}>{loading ? '–' : item.value}</span>
            <span className="text-sm text-on-surface-variant">{item.unit}</span>
          </p>
          <p className="mt-2 text-xs">{loading ? ' ' : item.foot}</p>
        </article>
      ))}
    </section>
  );
};
