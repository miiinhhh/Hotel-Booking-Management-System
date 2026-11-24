import React, { useCallback, useEffect, useRef, useState } from 'react';
import { discoveryRequest } from '../../services/discoveryApi';
import { notificationApi } from '../../services/notificationApi';
import { useLanguage, formatMoney, TranslationKey } from '../../i18n/LanguageContext';

export interface CustomerNotification {
  id: string;
  type: 'PaymentDue' | 'CheckInSoon' | 'RefundPending' | 'Refunded' | 'BookingConfirmed' | 'CheckedIn' | 'CheckedOut'
    | 'BookingCancelled' | 'BookingExpired' | 'ReviewInvite' | 'ReviewPublished' | 'ReviewHidden' | string;
  severity: 'action' | 'info';
  occurredAt: string;
  isRead: boolean;
  bookingId: number | null;
  bookingCode: string | null;
  hotelName: string | null;
  detail: string | null;
  amount: number | null;
  date: string | null;
}

const ICON: Record<string, string> = {
  PaymentDue: 'payments', CheckInSoon: 'luggage', RefundPending: 'currency_exchange', Refunded: 'savings',
  BookingConfirmed: 'event_available', CheckedIn: 'key', CheckedOut: 'logout', BookingCancelled: 'event_busy',
  BookingExpired: 'timer_off', ReviewInvite: 'rate_review', ReviewPublished: 'reviews', ReviewHidden: 'visibility_off',
};

interface Props {
  /** Mở trang liên quan: 'dat-phong-cua-toi' (đơn của tôi) hoặc 'danh-gia' (đánh giá). */
  onNavigate: (tab: string) => void;
  pollMs?: number;
}

/** Chuông thông báo của khách hàng: trạng thái đơn, thanh toán, hoàn tiền, mời & kết quả đánh giá. */
export const CustomerNotificationBell: React.FC<Props> = ({ onNavigate, pollMs = 60_000 }) => {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems((await discoveryRequest<{ data: CustomerNotification[] }>('/api/me/notifications')).data); }
    catch { /* giữ danh sách cũ */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = items.filter(n => !n.isRead).length;
  const markRead = (ids: string[]) => {
    const fresh = ids.filter(id => items.some(n => n.id === id && !n.isRead));
    if (!fresh.length) return;
    setItems(cur => cur.map(n => (fresh.includes(n.id) ? { ...n, isRead: true } : n)));
    void notificationApi.markRead(fresh).catch(() => undefined);
  };

  const timeAgo = (iso: string) => {
    const at = new Date(/Z|\+/.test(iso) ? iso : iso + 'Z').getTime();
    const min = Math.max(0, Date.now() - at) / 60_000;
    if (min < 1) return t('notif.justNow');
    if (min < 60) return t('notif.minutesAgo', { count: Math.floor(min) });
    if (min < 1440) return t('notif.hoursAgo', { count: Math.floor(min / 60) });
    return new Date(at).toLocaleDateString(locale);
  };

  const text = (n: CustomerNotification) => {
    const vars = {
      code: n.bookingCode ?? '', hotel: n.hotelName ?? t('notif.yourHotel'),
      amount: n.amount != null ? formatMoney(n.amount, locale) : '',
      date: n.date ? new Date(n.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }) : '',
    };
    const base = `notif.${n.type}`;
    const title = t(`${base}.title` as TranslationKey, vars);
    let desc = t(`${base}.desc` as TranslationKey, vars);
    if (n.type === 'CheckInSoon' && n.amount) desc += ' ' + t('notif.CheckInSoon.due', vars);
    if (n.type === 'PaymentDue' && n.amount) desc += ' ' + t('notif.PaymentDue.amount', vars);
    if (n.detail && (n.type === 'BookingCancelled' || n.type === 'ReviewHidden')) desc += ` ${t('notif.reason')}: ${n.detail}`;
    return { title, desc };
  };

  const openItem = (n: CustomerNotification) => {
    markRead([n.id]);
    setOpen(false);
    onNavigate(n.type.startsWith('Review') && n.type !== 'ReviewInvite' ? 'danh-gia' : 'dat-phong-cua-toi');
  };

  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={t('notif.title')} aria-expanded={open} onClick={() => { setOpen(v => !v); if (!open) void refresh(); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container">
        <span className="material-symbols-outlined text-[21px] text-on-surface-variant">notifications</span>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-on-primary">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[80] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-3.5">
            <div>
              <h2 className="font-semibold text-on-surface">{t('notif.title')}</h2>
              <p className="text-xs text-outline">{unread > 0 ? t('notif.unread', { count: unread }) : t('notif.allRead')}</p>
            </div>
            {unread > 0 && <button type="button" onClick={() => markRead(items.map(n => n.id))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container">{t('notif.markAll')}</button>}
          </div>
          <div className="max-h-[460px] overflow-y-auto p-2">
            {!items.length ? (
              <div className="p-8 text-center text-sm text-outline">
                <span className="material-symbols-outlined mb-2 block text-4xl">notifications_off</span>{loading ? t('notif.loading') : t('notif.empty')}
              </div>
            ) : items.map(n => {
              const { title, desc } = text(n);
              return (
                <button key={n.id} type="button" onClick={() => openItem(n)}
                  className={`mb-1 flex w-full gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-surface-container ${n.isRead ? '' : 'bg-primary-fixed/20'}`}>
                  <span className={`material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[19px] ${n.severity === 'action' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{ICON[n.type] ?? 'notifications'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 text-sm text-on-surface ${n.isRead ? 'font-medium' : 'font-semibold'}`}>{title}</span>
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{desc}</span>
                    <span className="mt-1 block text-[11px] text-outline">{timeAgo(n.occurredAt)}{n.bookingCode ? ` · ${n.bookingCode}` : ''}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerNotificationBell;
