import React, { useEffect, useState } from 'react';
import { useLanguage, formatMoney } from '../../../i18n/LanguageContext';
import { vi } from '../../../i18n/locales/vi';
import { BookingItem } from '../types';
import { previewCancelBooking, CancellationPreviewDto } from '../../../services/bookingApi';

interface CancelBookingModalProps {
  isOpen: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onConfirmCancel: (bookingId: string, reason: string) => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  booking,
  onClose,
  onConfirmCancel,
}) => {
  const { t, locale } = useLanguage();
  const REASONS = ['cancel.reason1', 'cancel.reason2', 'cancel.reason3', 'cancel.reason4'] as const;
  const [cancelReason, setCancelReason] = useState<string>(vi['cancel.reason1']);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<CancellationPreviewDto | null>(null);

  useEffect(() => {
    if (!isOpen || !booking) {
      setPreview(null);
      return;
    }

    const bookingIdNum = Number(booking.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      setLoadingPreview(true);
      previewCancelBooking(bookingIdNum)
        .then((res) => {
          if (res.success && res.data) {
            setPreview(res.data);
          }
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const paid = Number(preview?.totalPaid ?? preview?.paidAmount ?? booking.paidAmount ?? 0);
  const refund = Number(preview?.refundAmount ?? 0);
  const penalty = Number(preview?.penaltyAmount ?? 0);
  const refundPercent = preview?.refundPercentage ?? 0;
  const policyDesc = preview?.appliedPolicyName || preview?.policyDescription || preview?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-lg p-space-lg shadow-2xl transform transition-transform">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-outline hover:text-on-surface transition-colors cursor-pointer"
          aria-label={t('cancel.close')}
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>

        <div className="flex items-center gap-space-sm mb-4">
          <div className="w-10 h-10 rounded-full bg-error-container/40 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[22px]">event_busy</span>
          </div>
          <div>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
              {t('cancel.eyebrow')}
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {t('cancel.title')}
            </h3>
          </div>
        </div>

        <div className="bg-surface-container-low rounded p-space-md mb-space-md space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-surface-container">
            <span className="font-label-md text-label-md text-on-surface-variant">{t('cancel.code')}</span>
            <span className="font-headline-sm text-[16px] text-primary font-bold">
              {booking.bookingCode}
            </span>
          </div>

          {loadingPreview ? (
            <p className="text-xs text-outline py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              {t('cancel.loading')}</p>
          ) : preview ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('cancel.paid')}</span>
                <span className="font-semibold">{formatMoney(paid, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('cancel.rate')}</span>
                <span className="font-bold text-emerald-600">{refundPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('cancel.refund')}</span>
                <strong className="text-emerald-700 font-bold">{formatMoney(refund, locale)}</strong>
              </div>
              {penalty > 0 && (
                <div className="flex justify-between text-xs text-error">
                  <span>{t('cancel.penalty')}</span>
                  <span>{formatMoney(penalty, locale)}</span>
                </div>
              )}
              {policyDesc && (
                <p className="text-xs text-outline pt-1 italic">
                  {t('detail.cancelPolicy')}: {policyDesc}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('cancel.recorded')}</span>
                <span className="font-semibold">{formatMoney(booking.paidAmount || 0, locale)}</span>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant pt-1">
                {t('cancel.policyNote')}</p>
            </div>
          )}
        </div>

        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
          <span>{t('cancel.afterNote')}</span>
        </div>

        <div className="mb-space-lg">
          <label className="block font-label-md text-label-md text-on-surface mb-2 font-medium">
            {t('cancel.reason')}
          </label>
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full bg-surface rounded-full px-4 py-2.5 text-body-md text-on-surface outline-none focus:bg-surface-container transition-all cursor-pointer border border-outline-variant/30"
          >
            {REASONS.map(k => <option key={k} value={vi[k]}>{t(k)}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            {t('cancel.keep')}
          </button>
          <button
            onClick={() => onConfirmCancel(booking.id, cancelReason)}
            className="px-6 py-2.5 rounded-full bg-error text-on-error font-label-lg text-label-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t('cancel.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
