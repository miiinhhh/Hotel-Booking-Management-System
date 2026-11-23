import React, { useEffect, useState } from 'react';
import { CheckoutBookingData, PaymentMethodType } from '../types';
import { useLanguage, formatMoney } from '../../../i18n/LanguageContext';

interface OrderSummaryCardProps {
  bookingData: CheckoutBookingData;
  selectedPaymentMethod: PaymentMethodType;
  onApplyCoupon: (code: string) => boolean | Promise<boolean>;
  onConfirmBooking: () => void;
  isSubmitting: boolean;
  submissionStep: number;
}

/** Tóm tắt đơn: chỉ hiển thị số liệu thật từ máy chủ (giá, giảm giá, cọc). */
export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  bookingData, selectedPaymentMethod, onApplyCoupon, onConfirmBooking, isSubmitting, submissionStep,
}) => {
  const { t, locale } = useLanguage();
  const money = (n: number) => formatMoney(n, locale);
  const fmtDate = (iso?: string) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

  const [couponInput, setCouponInput] = useState(bookingData.couponCode);
  // Đồng bộ ô nhập khi mã được áp dụng từ bên ngoài (vd. chọn ở trang Ưu đãi).
  useEffect(() => { setCouponInput(bookingData.couponCode); }, [bookingData.couponCode]);
  const [couponState, setCouponState] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');

  const handleApply = async () => {
    if (!couponInput.trim()) return;
    setCouponState('checking');
    setCouponState((await onApplyCoupon(couponInput.trim())) ? 'ok' : 'bad');
  };

  const payAtHotel = selectedPaymentMethod === 'pay_at_hotel';
  const dueToday = payAtHotel ? 0 : bookingData.depositAmount;
  const dueAtHotel = payAtHotel ? bookingData.totalPrice : bookingData.remainingAmount;

  return (
    <div className="lg:col-span-5 sticky top-28 flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest rounded-2xl p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
        {/* Khách sạn */}
        <div className="flex gap-space-sm items-start">
          {bookingData.hotelImage && <img src={bookingData.hotelImage} alt={bookingData.hotelName} className="w-24 h-24 rounded-2xl object-cover shrink-0 shadow-sm" />}
          <div className="flex flex-col min-w-0">
            <h3 className="text-on-surface text-lg font-semibold leading-tight">{bookingData.hotelName}</h3>
            {bookingData.location && (
              <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>{bookingData.location}
              </p>
            )}
          </div>
        </div>

        {/* Phòng */}
        <div className="bg-surface-container-low/60 rounded-2xl p-space-sm flex flex-col gap-2">
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">{t('checkout.room')}</span>
            <h4 className="text-on-surface text-base font-semibold">{bookingData.roomName}</h4>
          </div>
          {bookingData.roomAmenities.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant">
              {bookingData.roomAmenities.map((amenity) => (
                <span key={amenity} className="inline-flex items-center gap-1 bg-surface-container-lowest px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[14px] text-primary">check</span>{amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ngày */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col p-2.5 rounded-2xl bg-surface-container-low/40">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">{t('ticket.checkIn')}</span>
            <span className="text-on-surface text-sm font-semibold mt-0.5">{fmtDate(bookingData.checkIn)}</span>
          </div>
          <div className="flex flex-col p-2.5 rounded-2xl bg-surface-container-low/40">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">{t('ticket.checkOut')}</span>
            <span className="text-on-surface text-sm font-semibold mt-0.5">{fmtDate(bookingData.checkOut)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-on-surface-variant px-1">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bed</span>{t('checkout.nights', { count: bookingData.nightsCount })}</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">group</span>{t('ticket.guests', { count: bookingData.numberOfGuests || 1 })}</span>
        </div>

        {/* Mã ưu đãi */}
        <div className="bg-surface-container-low/50 p-space-sm rounded-2xl flex flex-col gap-2">
          <div className="flex gap-2">
            <input type="text" value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCouponState('idle'); }}
              placeholder={t('checkout.couponPh')}
              className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-full text-sm uppercase tracking-wider focus:ring-1 focus:ring-primary focus:outline-none" />
            <button type="button" onClick={() => void handleApply()} disabled={couponState === 'checking'}
              className="px-4 py-2 bg-surface-container-highest hover:bg-surface-dim text-on-surface text-sm font-semibold rounded-full transition-colors whitespace-nowrap disabled:opacity-50">
              {t('checkout.apply')}
            </button>
          </div>
          {couponState === 'checking' && <p className="px-2 text-xs text-on-surface-variant">{t('checkout.couponChecking')}</p>}
          {couponState === 'bad' && <p role="alert" className="px-2 text-xs text-error">{t('checkout.couponInvalid')}</p>}
          {bookingData.couponDiscount > 0 && couponState !== 'bad' && (
            <p className="flex items-center gap-1 px-2 text-xs font-medium text-primary">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>{t('checkout.couponApplied', { code: bookingData.couponCode })}
            </p>
          )}
        </div>

        {/* Giá */}
        <div className="flex flex-col gap-2.5 py-1 text-sm">
          <div className="flex justify-between text-on-surface-variant">
            <span>{t(bookingData.roomSubTotal != null ? 'checkout.roomPriceNet' : 'checkout.roomPrice', { count: bookingData.nightsCount })}</span>
            <span className="text-on-surface font-medium">{money(bookingData.roomSubTotal ?? bookingData.originalPrice)}</span>
          </div>
          {bookingData.couponDiscount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{t('checkout.discount', { code: bookingData.couponCode })}</span>
              <span className="font-semibold">−{money(bookingData.couponDiscount)}</span>
            </div>
          )}
          {bookingData.roomSubTotal != null && (
            <>
              <div className="flex justify-between text-on-surface-variant">
                <span>{t('checkout.serviceFee', { rate: Math.round((bookingData.feeRate ?? 0) * 100) })}</span>
                <span className="text-on-surface font-medium">{money(bookingData.feeAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>{t('checkout.vat', { rate: Math.round((bookingData.taxRate ?? 0) * 100) })}</span>
                <span className="text-on-surface font-medium">{money(bookingData.taxAmount ?? 0)}</span>
              </div>
            </>
          )}
          <div className="w-full h-px bg-surface-container-high my-1" />
          <div className="flex justify-between items-baseline">
            <span className="flex flex-col">
              <span className="text-base font-semibold text-on-surface">{t('checkout.total')}</span>
              <span className="text-xs text-on-surface-variant">{t('checkout.totalNote')}</span>
            </span>
            <span className="text-2xl text-on-surface tracking-tight font-bold">{money(bookingData.totalPrice)}</span>
          </div>
          <div className="bg-surface-container-low p-space-sm rounded-2xl flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-on-surface">{t('checkout.dueToday')}</span>
              <span className="text-lg text-primary font-bold">{money(dueToday)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>{t('checkout.dueAtHotel')}</span>
              <span className="font-semibold">{money(dueAtHotel)}</span>
            </div>
          </div>
        </div>

        {/* Nút đặt */}
        <button type="button" onClick={onConfirmBooking} disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-container text-on-primary font-semibold py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-75 disabled:cursor-wait">
          {isSubmitting ? (
            <>
              <span className={`material-symbols-outlined text-[20px] ${submissionStep === 1 ? 'animate-spin' : ''}`}>{submissionStep === 1 ? 'progress_activity' : 'done_all'}</span>
              <span>{submissionStep === 1 ? t('checkout.creating') : t('checkout.redirecting')}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">lock</span>
              <span>{payAtHotel ? t('checkout.confirmHold') : t('checkout.confirmPay', { amount: money(dueToday) })}</span>
            </>
          )}
        </button>

        {/* Cam kết — chỉ nêu điều hệ thống thực sự làm */}
        <ul className="flex flex-col gap-2 pt-1 text-xs text-on-surface-variant">
          <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[16px] text-primary">security</span>{t('checkout.trustVnpay')}</li>
          <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[16px] text-primary">policy</span>{t('checkout.trustCancel')}</li>
          <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[16px] text-primary">event_repeat</span>{t('checkout.trustManage')}</li>
        </ul>
      </div>
    </div>
  );
};
export default OrderSummaryCard;
