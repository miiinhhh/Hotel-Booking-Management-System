import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

/** Giờ UTC từ máy chủ có thể thiếu "Z": coi như UTC. */
export const parseUtc = (iso: string) => new Date(/Z|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z').getTime();

/** Số giây còn lại tới `expiresAt` (0 khi hết hạn), tự cập nhật mỗi giây. */
export function useHoldSecondsLeft(expiresAt?: string | null, onExpired?: () => void) {
  const target = expiresAt ? parseUtc(expiresAt) : NaN;
  const calc = () => (Number.isNaN(target) ? 0 : Math.max(0, Math.floor((target - Date.now()) / 1000)));
  const [left, setLeft] = useState(calc);
  const fired = useRef(false);
  const expiredRef = useRef(onExpired);
  expiredRef.current = onExpired;

  useEffect(() => {
    fired.current = false;
    setLeft(calc());
    if (Number.isNaN(target)) return;
    const timer = window.setInterval(() => {
      const next = calc();
      setLeft(next);
      if (next === 0 && !fired.current) { fired.current = true; window.clearInterval(timer); expiredRef.current?.(); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return Number.isNaN(target) ? null : left;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Đồng hồ giữ phòng chờ thanh toán cọc (15 phút). Dưới 3 phút chuyển màu cảnh báo.
 * Hết giờ: báo phòng đã được mở lại và gọi `onExpired` (VD tải lại danh sách đơn).
 */
export const HoldCountdown: React.FC<{ expiresAt?: string | null; onExpired?: () => void; className?: string }> = ({ expiresAt, onExpired, className = '' }) => {
  const { t } = useLanguage();
  const left = useHoldSecondsLeft(expiresAt, onExpired);
  if (left === null) return null;
  if (left === 0) {
    return <p role="status" className={`flex items-center gap-2 rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant ${className}`}>
      <span className="material-symbols-outlined text-[20px]">timer_off</span>{t('hold.expired')}
    </p>;
  }
  const urgent = left < 180;
  return (
    <p role="timer" aria-live="off" className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${urgent ? 'bg-error-container text-on-error-container' : 'bg-amber-50 text-amber-900'} ${className}`}>
      <span className="material-symbols-outlined text-[20px]">timer</span>
      <span>{t('hold.left')} <b className="font-mono text-base tabular-nums">{mmss(left)}</b></span>
    </p>
  );
};
export default HoldCountdown;
