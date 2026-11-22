import React from 'react';
import { PaymentMethodType } from '../types';
import { useLanguage, formatMoney } from '../../../i18n/LanguageContext';

interface PaymentMethodSectionProps {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  depositAmount: number;
  remainingAmount: number;
  depositPercentage?: number;
}

/** Chỉ 2 phương thức hệ thống đang hỗ trợ: cọc qua VNPay và trả tại khách sạn. */
export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({ selectedMethod, onSelectMethod, depositAmount, remainingAmount, depositPercentage }) => {
  const { t, locale } = useLanguage();
  const card = (active: boolean) => `relative flex flex-col p-space-md rounded-2xl cursor-pointer transition-all border ${
    active ? 'bg-surface-container-low/70 shadow-sm border-primary/30' : 'bg-surface-container-low/30 hover:bg-surface-container-low border-transparent'}`;

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center gap-space-sm pb-space-xs">
        <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">3</span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('checkout.paymentTitle')}</h2>
      </div>

      <div className="flex flex-col gap-space-sm">
        {/* VNPay */}
        <label className={card(selectedMethod === 'qr_napas')}>
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex items-start gap-3">
              <input type="radio" name="payment_method" checked={selectedMethod === 'qr_napas'} onChange={() => onSelectMethod('qr_napas')}
                className="mt-1 w-4 h-4 accent-primary cursor-pointer" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-on-surface font-semibold text-base">{t('checkout.payVnpay')}</span>
                  <span className="px-2.5 py-0.5 bg-primary-fixed/60 text-primary text-xs font-semibold rounded-full">{t('checkout.payVnpayBadge')}</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{t('checkout.payVnpayDesc')}</p>
              </div>
            </div>
            <span className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-primary text-[22px]">account_balance</span>
            </span>
          </div>
          <div className="mt-space-sm bg-surface-container-lowest p-space-sm rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              {t('checkout.depositNow', { percent: depositPercentage ?? 0 })}
            </span>
            <span className="text-right">
              <span className="font-bold text-primary">{formatMoney(depositAmount, locale)}</span>
              <span className="block text-xs text-on-surface-variant">{t('checkout.remainingAtHotel', { amount: formatMoney(remainingAmount, locale) })}</span>
            </span>
          </div>
        </label>

        {/* Tại khách sạn */}
        <label className={card(selectedMethod === 'pay_at_hotel')}>
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex items-start gap-3">
              <input type="radio" name="payment_method" checked={selectedMethod === 'pay_at_hotel'} onChange={() => onSelectMethod('pay_at_hotel')}
                className="mt-1 w-4 h-4 accent-primary cursor-pointer" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-on-surface font-semibold text-base">{t('checkout.payAtHotel')}</span>
                  <span className="px-2.5 py-0.5 bg-surface-container text-on-surface text-xs font-medium rounded-full">{t('checkout.payAtHotelBadge')}</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{t('checkout.payAtHotelDesc')}</p>
              </div>
            </div>
            <span className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">payments</span>
            </span>
          </div>
        </label>
      </div>
    </section>
  );
};
export default PaymentMethodSection;
