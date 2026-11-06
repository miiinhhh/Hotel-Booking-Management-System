import React from 'react';

export type StatusType =
  | 'Pending'
  | 'Confirmed'
  | 'CheckedIn'
  | 'Completed'
  | 'Cancelled'
  | 'Expired'
  | 'Unpaid'
  | 'PartiallyPaid'
  | 'Paid'
  | 'RefundPending'
  | 'Refunded'
  | 'Failed';

export interface StatusBadgeProps {
  status: StatusType | string;
  type?: 'booking' | 'payment';
  customLabel?: string;
  className?: string;
}

interface BadgeStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
  pulse?: boolean;
}

const BADGE_CONFIG: Record<string, BadgeStyle> = {
  // === Booking Statuses ===
  Pending: {
    label: 'CHỜ XÁC NHẬN',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: 'timelapse',
    pulse: true,
  },
  Confirmed: {
    label: 'ĐÃ XÁC NHẬN',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: 'check_circle',
  },
  CheckedIn: {
    label: 'ĐÃ CHECK-IN',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'key',
  },
  Completed: {
    label: 'ĐÃ HOÀN TẤT',
    bg: 'bg-surface-container',
    text: 'text-on-surface-variant',
    border: 'border-outline-variant/30',
    icon: 'task_alt',
  },
  Cancelled: {
    label: 'ĐÃ HỦY',
    bg: 'bg-error-container/40',
    text: 'text-error',
    border: 'border-error/20',
    icon: 'close',
  },
  Expired: {
    label: 'HẾT HẠN',
    bg: 'bg-surface-container-high',
    text: 'text-outline',
    border: 'border-outline-variant/20',
    icon: 'timer_off',
  },

  // === Payment Statuses ===
  Unpaid: {
    label: 'CHƯA THANH TOÁN',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: 'error',
  },
  PartiallyPaid: {
    label: 'ĐÃ ĐẶT CỌC (70%)',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    icon: 'payments',
  },
  Paid: {
    label: 'ĐÃ TRẢ 100%',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: 'verified',
  },
  RefundPending: {
    label: 'CHỜ HOÀN CỌC',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-400',
    icon: 'pending_actions',
    pulse: true,
  },
  Refunded: {
    label: 'ĐÃ HOÀN CỌC',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: 'replay',
  },
  Failed: {
    label: 'GIAO DỊCH LỖI',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'cancel',
  },
};

/**
 * Chuẩn hóa chuỗi trạng thái về dạng PascalCase để tra cứu
 * (hỗ trợ cả chữ thường/kèm gạch dưới ví dụ: 'pending_deposit' -> 'Pending')
 */
function normalizeStatusKey(rawStatus: string): string {
  if (!rawStatus) return 'Pending';
  const clean = rawStatus.trim().toLowerCase();

  switch (clean) {
    case 'pending':
    case 'pending_deposit':
      return 'Pending';
    case 'confirmed':
    case 'confirmed_deposit':
      return 'Confirmed';
    case 'checkedin':
    case 'checked_in':
      return 'CheckedIn';
    case 'completed':
    case 'checkedout':
    case 'checked_out':
    case 'staying':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';

    case 'unpaid':
      return 'Unpaid';
    case 'partiallypaid':
    case 'deposited_50':
    case 'deposited_70':
      return 'PartiallyPaid';
    case 'paid':
    case 'paid_100':
      return 'Paid';
    case 'refundpending':
    case 'refund_pending':
      return 'RefundPending';
    case 'refunded':
      return 'Refunded';
    case 'failed':
      return 'Failed';

    default:
      return rawStatus;
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  className = '',
}) => {
  const normalizedKey = normalizeStatusKey(status);
  const config = BADGE_CONFIG[normalizedKey] || {
    label: customLabel || status,
    bg: 'bg-surface-container',
    text: 'text-on-surface',
    border: 'border-outline-variant/40',
    icon: 'info',
    pulse: false,
  };

  const displayText = customLabel || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border transition-colors ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[14px] shrink-0 ${
          config.pulse ? 'animate-pulse' : ''
        }`}
      >
        {config.icon}
      </span>
      <span className="leading-none">{displayText}</span>
    </span>
  );
};

export default StatusBadge;
