import React, { useEffect } from 'react';
import { BookingItem } from '../types';
import { BookingTimeline } from '../../../components/booking/BookingTimeline';
import { useLanguage, formatMoney } from '../../../i18n/LanguageContext';

interface Props {
  booking: BookingItem | null;
  onClose: () => void;
}

/** Chi tiết một đơn của khách: thông tin lưu trú, số tiền, giao dịch và lịch sử trạng thái. */
export const BookingDetailsDrawer: React.FC<Props> = ({ booking, onClose }) => {
  const { t, language, locale } = useLanguage();

  useEffect(() => {
    if (!booking) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [booking, onClose]);

  if (!booking) return null;
  const money = (n?: number) => formatMoney(n ?? 0, locale);
  const section = 'rounded-2xl bg-surface-container-lowest p-5 shadow-sm';
  const paid = booking.paidAmount ?? 0;
  const remaining = booking.remainingAmount ?? Math.max(0, booking.totalAmount - paid);

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="bk-detail-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface-container-low shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-surface-container-low/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="font-mono text-xs text-on-surface-variant">{booking.bookingCode}</p>
            <h2 id="bk-detail-title" className="truncate text-lg font-semibold text-on-surface">{booking.hotelName}</h2>
            <span className="mt-1 inline-block rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">{booking.statusLabel}</span>
          </div>
          <button type="button" onClick={onClose} aria-label={t('bkd.close')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 pb-8">
          <div className={section}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2"><dt className="text-xs text-on-surface-variant">{t('bkd.room')}</dt><dd className="font-medium text-on-surface">{booking.roomType}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">{t('bkd.checkIn')}</dt><dd className="font-medium text-on-surface">{booking.checkInDate}</dd><dd className="text-xs text-on-surface-variant">{booking.checkInDetail}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">{t('bkd.checkOut')}</dt><dd className="font-medium text-on-surface">{booking.checkOutDate}</dd><dd className="text-xs text-on-surface-variant">{booking.checkOutDetail}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">{t('bkd.stay')}</dt><dd className="text-on-surface">{booking.nightsText}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">{t('bkd.guests')}</dt><dd className="text-on-surface">{booking.guest.countText}</dd></div>
            </dl>
          </div>

          <div className={section}>
            <h3 className="mb-3 text-sm font-semibold text-on-surface">{t('bkd.amounts')}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-on-surface-variant">{t('bkd.total')}</dt><dd className="font-semibold tabular-nums text-on-surface">{money(booking.totalAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-on-surface-variant">{t('bkd.paid')}</dt><dd className="tabular-nums text-emerald-700">{money(paid)}</dd></div>
              {booking.refundAmount ? <div className="flex justify-between"><dt className="text-on-surface-variant">{t('bkd.refund')}</dt><dd className="tabular-nums text-violet-700">{money(booking.refundAmount)}</dd></div> : null}
              {booking.status !== 'cancelled' && (
                <div className="flex justify-between border-t border-outline-variant/40 pt-2"><dt className="font-semibold text-on-surface">{t('bkd.remaining')}</dt><dd className="font-bold tabular-nums text-primary">{money(remaining)}</dd></div>
              )}
            </dl>
          </div>

          <BookingTimeline bookingId={booking.id} lang={language === 'en' ? 'en' : 'vi'} sectionClassName={section} />
        </div>
      </section>
    </div>
  );
};
export default BookingDetailsDrawer;
