import React from 'react';
import { StaffBookingStatus, StaffDepositStatus } from '../types';

/** "2026-11-20" -> "20/11/2026"; giữ nguyên nếu không đúng định dạng. */
export const viDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** "2026-11-20" -> "20/11" (dùng trong bảng cho gọn). */
export const shortDate = (iso: string) => {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[1]}` : iso;
};

export const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

export const BOOKING_STATUS_UI: Record<StaffBookingStatus, { label: string; className: string; dot: string }> = {
  pending_deposit: { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  confirmed_deposit: { label: 'Đã xác nhận', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-600' },
  checked_in: { label: 'Đang lưu trú', className: 'bg-sky-50 text-sky-800 ring-sky-600/20', dot: 'bg-sky-600' },
  staying: { label: 'Đã trả phòng', className: 'bg-surface-container-high text-on-surface-variant ring-outline/20', dot: 'bg-outline' },
  cancelled: { label: 'Đã hủy', className: 'bg-surface-container text-outline ring-outline/20', dot: 'bg-outline-variant' },
};

export const PAYMENT_UI: Record<StaffDepositStatus, { label: string; className: string }> = {
  unpaid: { label: 'Chưa thanh toán', className: 'text-amber-800' },
  deposited_50: { label: 'Đã đặt cọc', className: 'text-on-surface-variant' },
  paid_100: { label: 'Đã thanh toán đủ', className: 'text-emerald-700' },
  refund_pending: { label: 'Chờ hoàn tiền', className: 'text-amber-800 font-semibold' },
  refunded: { label: 'Đã hoàn tiền', className: 'text-violet-700' },
};

export const StatusBadge: React.FC<{ status: StaffBookingStatus }> = ({ status }) => {
  const ui = BOOKING_STATUS_UI[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ui.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />{ui.label}
    </span>
  );
};

const TIER_UI: Record<string, { label: string; className: string }> = {
  PLATINUM: { label: 'Platinum', className: 'bg-slate-100 text-slate-800 ring-slate-400/30' },
  GOLD: { label: 'Gold', className: 'bg-amber-50 text-amber-800 ring-amber-500/30' },
  SILVER: { label: 'Silver', className: 'bg-stone-100 text-stone-700 ring-stone-400/30' },
};

/** Hạng khách theo tổng chi tiêu (máy chủ tính). Khách hạng thường không gắn nhãn. */
export const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
  const ui = TIER_UI[tier];
  if (!ui) return null;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${ui.className}`}>{ui.label}</span>;
};

/** Thanh tiến độ thanh toán: đã thu / tổng tiền. */
export const PaidBar: React.FC<{ paid: number; total: number }> = ({ paid, total }) => {
  const ratio = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
      <div className={`h-full rounded-full ${ratio >= 100 ? 'bg-emerald-600' : 'bg-primary-container'}`} style={{ width: `${ratio}%` }} />
    </div>
  );
};
