import { HoldCountdown, useHoldSecondsLeft } from '../../../components/booking/HoldCountdown';
import React, { useState } from 'react';
import { previewCancelBooking } from '../../../services/bookingApi';
import { BookingItem } from '../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { SELF_PERMISSIONS } from '../../../auth/permissions';
import { useLanguage, formatMoney } from '../../../i18n/LanguageContext';

interface BookingTicketCardProps {
  booking: BookingItem;
  onCopyCode: (code: string) => void;
  onOpenCancelModal: (booking: BookingItem) => void;
  onOpenReviewModal: (booking: BookingItem) => void;
  onPayNow?: (booking: BookingItem, paymentTarget?: 'Deposit' | 'Full') => void;
  onRebook?: (booking: BookingItem) => void;
  onReschedule?: (booking: BookingItem) => void;
  onViewDetails?: (booking: BookingItem) => void;
  /** Hết 15 phút giữ phòng: tải lại danh sách để đơn chuyển sang hết hạn. */
  onHoldExpired?: () => void;
}

const BTN_PRIMARY = 'w-full py-2.5 px-4 rounded-full bg-primary text-on-primary font-semibold text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2';
const BTN_OUTLINE = 'w-full py-2 px-4 rounded-full border border-outline-variant text-on-surface font-medium text-sm hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5';
const BTN_SOFT = 'w-full py-2 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium text-sm transition-colors flex items-center justify-center gap-1.5';

/** Thẻ một đơn đặt phòng: chỉ hiển thị dữ liệu thật và các thao tác hệ thống hỗ trợ. */
export const BookingTicketCard: React.FC<BookingTicketCardProps> = ({
  booking, onCopyCode, onOpenCancelModal, onOpenReviewModal, onPayNow, onRebook, onReschedule, onViewDetails, onHoldExpired,
}) => {
  const { hasPermission } = useAuth();
  const { t, locale } = useLanguage();
  const money = (n?: number) => formatMoney(n ?? 0, locale);
  const fmtDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const canPay = hasPermission(SELF_PERMISSIONS.paymentManage);
  const canCancel = hasPermission(SELF_PERMISSIONS.bookingCancel);
  const canReview = hasPermission(SELF_PERMISSIONS.reviewManage);
  const isPending = booking.status === 'pending';
  const holdLeft = useHoldSecondsLeft(isPending ? booking.holdExpiresAt : null, onHoldExpired);
  const holdExpired = holdLeft === 0;
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isConfirmed = booking.status === 'confirmed';
  const nights = Math.max(1, Math.round((Date.parse(booking.checkOutDate) - Date.parse(booking.checkInDate)) / 86_400_000));

  // Mức hoàn khi hủy NGAY BÂY GIỜ, do server tính theo chính sách hủy của khách sạn (tải khi rê chuột).
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const loadCancelNotice = async () => {
    if (cancelNotice !== null) return;
    setCancelNotice(t('ticket.noticeLoading'));
    try {
      const res = await previewCancelBooking(Number(booking.id));
      const p = res.data;
      if (!res.success || !p) { setCancelNotice(t('ticket.noticeDefault')); return; }
      const paid = p.totalPaid ?? p.paidAmount ?? 0;
      setCancelNotice(paid <= 0
        ? t('ticket.noticeUnpaid')
        : t('ticket.noticeRefund', { percent: p.refundPercentage, amount: money(p.refundAmount), policy: p.appliedPolicyName ? ` · ${p.appliedPolicyName}` : '' }));
    } catch {
      setCancelNotice(t('ticket.noticeDefault'));
    }
  };

  const cancelButton = canCancel && (
    <div className="relative group w-full" onMouseEnter={() => void loadCancelNotice()} onFocus={() => void loadCancelNotice()}>
      <button type="button" onClick={() => onOpenCancelModal(booking)} className={BTN_SOFT}>
        <span className="material-symbols-outlined text-[16px] text-error">cancel</span>{t('ticket.cancel')}
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-60 -translate-x-1/2 flex-col items-center group-hover:flex">
        <div className="rounded-2xl bg-inverse-surface p-2 text-center text-[11px] text-inverse-on-surface shadow-lg">{cancelNotice ?? t('ticket.noticeDefault')}</div>
        <div className="-mt-1 h-2 w-2 rotate-45 bg-inverse-surface" />
      </div>
    </div>
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md lg:flex-row">
      {/* Ảnh */}
      <div className="relative h-48 shrink-0 lg:h-auto lg:w-64">
        <img src={booking.image} alt={booking.imageAlt || booking.hotelName}
          className={`h-full w-full object-cover ${isCancelled ? 'grayscale-[40%]' : ''}`} />
        <span className="absolute bottom-3 left-3 rounded-full bg-surface-container-lowest/95 px-3 py-1 text-xs font-semibold text-on-surface shadow-sm">
          {t('ticket.nights', { count: nights })}
        </span>
      </div>

      {/* Thông tin */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-on-surface">{booking.hotelName}</h2>
            {booking.roomType && <p className="text-sm text-on-surface-variant">{booking.roomType}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={booking.statusRaw || booking.status} type="booking" />
            <StatusBadge status={booking.paymentStatus || 'Unpaid'} type="payment" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-on-surface-variant">{t('ticket.code')}:</span>
          <strong className="tracking-wide text-on-surface">{booking.bookingCode}</strong>
          <button type="button" onClick={() => onCopyCode(booking.bookingCode)} title={t('ticket.copy')} aria-label={t('ticket.copy')}
            className="text-outline transition-colors hover:text-primary">
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-container-low p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-on-surface-variant">{t('ticket.checkIn')}</p>
            <p className="font-semibold text-on-surface">{fmtDate(booking.checkInDate)}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">{t('ticket.checkOut')}</p>
            <p className="font-semibold text-on-surface">{fmtDate(booking.checkOutDate)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-on-surface-variant">{t('ticket.total')}</p>
            <p className="font-semibold text-on-surface">{money(booking.totalAmount)}</p>
            <p className="text-xs text-on-surface-variant">
              {t('ticket.rooms', { count: booking.roomCount ?? 1 })} · {t('ticket.guests', { count: booking.numberOfGuests ?? 1 })}
            </p>
          </div>
        </div>

        {/* Dòng trạng thái theo từng loại đơn */}
        {isConfirmed && (
          <p className="text-sm text-on-surface-variant">
            {t('ticket.paid')}: <strong className="text-on-surface">{money(booking.paidAmount)}</strong>
            {(booking.remainingAmount ?? 0) > 0 && <> · {t('ticket.remaining')}: <strong className="text-on-surface">{money(booking.remainingAmount)}</strong></>}
          </p>
        )}
        {isPending && (booking.holdExpiresAt
          ? <HoldCountdown expiresAt={booking.holdExpiresAt} />
          : <p className="text-sm text-on-surface-variant">{t('ticket.pendingNote')}</p>)}
        {isCompleted && <p className="flex items-center gap-1.5 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-[18px] text-primary">sentiment_satisfied</span>{t('ticket.completedNote')}</p>}
        {isCancelled && (
          <p className="flex items-start gap-1.5 text-sm">
            {booking.paymentStatus === 'RefundPending' ? (
              <><span className="material-symbols-outlined text-[18px] text-amber-600">pending</span><span className="text-amber-800">{t('ticket.refundPending')}</span></>
            ) : booking.paymentStatus === 'Refunded' ? (
              <><span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                <span className="text-on-surface-variant">{t('ticket.refunded', { amount: money(booking.refundAmount), date: booking.refundedAt ? t('ticket.refundedOn', { date: fmtDate(booking.refundedAt) }) : '' })}</span></>
            ) : (
              <><span className="material-symbols-outlined text-[18px] text-on-surface-variant">info</span><span className="text-on-surface-variant">{t('ticket.cancelledNote')}</span></>
            )}
          </p>
        )}
      </div>

      {/* Thao tác */}
      <div className="flex shrink-0 flex-col justify-center gap-2 border-t border-outline-variant/30 bg-surface-container-low/50 p-5 lg:w-64 lg:border-l lg:border-t-0">
        {isConfirmed && (
          <>
            {canPay && booking.paymentStatus === 'PartiallyPaid' && (booking.remainingAmount ?? 0) > 0 && (
              <button type="button" onClick={() => onPayNow?.(booking, 'Full')} className={BTN_PRIMARY}>
                <span className="material-symbols-outlined text-[18px]">payments</span>{t('ticket.payRemaining', { amount: money(booking.remainingAmount) })}
              </button>
            )}
            {canCancel && onReschedule && (
              <button type="button" onClick={() => onReschedule(booking)} className={BTN_OUTLINE}>
                <span className="material-symbols-outlined text-[16px] text-primary">event_repeat</span>{t('ticket.reschedule')}
              </button>
            )}
            {cancelButton}
          </>
        )}

        {isPending && (
          <>
            {canPay && !holdExpired && (
              <button type="button" onClick={() => onPayNow?.(booking, 'Deposit')} className={BTN_PRIMARY}>
                <span className="material-symbols-outlined text-[18px]">payment</span>{t('ticket.payNow', { amount: money(booking.depositDue || booking.totalAmount) })}
              </button>
            )}
            {cancelButton}
          </>
        )}

        {isCompleted && (
          <>
            {canReview && !booking.reviewDeleted && (
              <button type="button" onClick={() => onOpenReviewModal(booking)} className={BTN_PRIMARY}>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                {booking.hasReview ? t('ticket.editReview') : t('ticket.writeReview')}
              </button>
            )}
            <button type="button" onClick={() => onRebook?.(booking)} className={BTN_SOFT}>
              <span className="material-symbols-outlined text-[16px]">sync</span>{t('ticket.rebook')}
            </button>
          </>
        )}

        {isCancelled && (
          <button type="button" onClick={() => onRebook?.(booking)} className={BTN_SOFT}>
            <span className="material-symbols-outlined text-[16px]">travel_explore</span>{t('ticket.findOther')}
          </button>
        )}

        {onViewDetails && (
          <button type="button" onClick={() => onViewDetails(booking)} className="flex items-center justify-center gap-1 py-1 text-sm font-semibold text-primary hover:underline">
            {t('ticket.viewDetails')}<span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        )}
      </div>
    </article>
  );
};
export default BookingTicketCard;
