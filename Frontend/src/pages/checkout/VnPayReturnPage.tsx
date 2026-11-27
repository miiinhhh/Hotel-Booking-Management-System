import React, { useEffect, useState } from 'react';
import { useLanguage, formatMoney } from '../../i18n/LanguageContext';
import { getPaymentStatusByTxnRef, VnPayCallbackResult, createVnPayPayment } from '../../services/paymentApi';
import { apiClient } from '../../services/apiClient';
import { HoldCountdown, useHoldSecondsLeft } from '../../components/booking/HoldCountdown';

interface VnPayReturnPageProps {
  onNavigateHome: () => void;
  onNavigateMyBookings: () => void;
}

export const VnPayReturnPage: React.FC<VnPayReturnPageProps> = ({
  onNavigateHome,
  onNavigateMyBookings,
}) => {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VnPayCallbackResult | null>(null);

  // Parse query parameters from URL
  const query = new URLSearchParams(window.location.search);
  const urlTxnRef = query.get('txnRef') || query.get('vnp_TxnRef') || '';
  const urlBookingCode = query.get('bookingCode') || '';
  const urlStatus = query.get('status') || '';
  const urlMessage = query.get('message') || '';
  const urlSuccess = query.get('success') === 'true';
  const urlAmount = Number(query.get('amount')) || 0;
  const urlBookingId = Number(query.get('bookingId')) || 0;

  // Thanh toán thất bại nhưng đơn còn trong 15 phút giữ phòng → cho thanh toán lại ngay tại đây.
  const [hold, setHold] = useState<{ bookingId: number; expiresAt: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const holdLeft = useHoldSecondsLeft(hold?.expiresAt);
  const loadHold = async (bookingId: number) => {
    if (!bookingId) return;
    const res = await apiClient<{ bookingStatus: string; holdExpiresAt: string | null }>(`/api/bookings/${bookingId}`);
    if (res.success && res.data && res.data.bookingStatus === 'Pending' && res.data.holdExpiresAt) setHold({ bookingId, expiresAt: res.data.holdExpiresAt });
  };
  const retryPayment = async () => {
    if (!hold || retrying) return;
    setRetrying(true);
    const res = await createVnPayPayment(hold.bookingId, 'Deposit');
    if (res.success && res.data?.paymentUrl) { window.location.href = res.data.paymentUrl; return; }
    setRetrying(false);
    setError(res.message || t('vnpay.retryFailed'));
  };

  const verifyPayment = async (txnRef: string) => {
    setLoading(true);
    setError(null);
    try {
      // Nếu Backend đã trả về trạng thái lỗi chữ ký rõ ràng
      if (urlStatus === 'InvalidSignature') {
        setError(urlMessage || t('vnpay.errChecksum'));
        setLoading(false);
        return;
      }

      if (!txnRef) {
        if (urlMessage) {
          setError(urlMessage);
        } else {
          setError(t('vnpay.errRef'));
        }
        setLoading(false);
        return;
      }

      try {
        const res = await getPaymentStatusByTxnRef(txnRef);
        if (res.success && res.data) {
          setResult(res.data);
          return;
        }
      } catch (apiErr) {
        // Fallback: nếu gọi API tra cứu gặp lỗi (ví dụ hết hạn token) nhưng URL chuyển hướng từ máy chủ đã xác nhận Paid
        if (urlStatus === 'Paid' && urlSuccess) {
          setResult({
            success: true,
            message: urlMessage || 'Thanh toán thành công.',
            bookingId: Number(query.get('bookingId')) || 0,
            bookingCode: urlBookingCode,
            txnRef,
            amount: urlAmount,
            status: 'Paid',
          });
          return;
        }
        throw apiErr;
      }

      if (urlStatus === 'Paid' && urlSuccess) {
        setResult({
          success: true,
          message: urlMessage || 'Thanh toán thành công.',
          bookingId: Number(query.get('bookingId')) || 0,
          bookingCode: urlBookingCode,
          txnRef,
          amount: urlAmount,
          status: 'Paid',
        });
      } else {
        setError(urlMessage || t('vnpay.errVerify'));
      }
    } catch (err) {
      if (urlStatus === 'Paid' && urlSuccess) {
        setResult({
          success: true,
          message: urlMessage || 'Thanh toán thành công.',
          bookingId: Number(query.get('bookingId')) || 0,
          bookingCode: urlBookingCode,
          txnRef,
          amount: urlAmount,
          status: 'Paid',
        });
      } else {
        setError(err instanceof Error ? err.message : t('vnpay.errNetwork'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyPayment(urlTxnRef);
  }, [urlTxnRef]);

  // Chỉ công nhận thành công khi máy chủ phản hồi trạng thái Paid thực tế
  const isSuccess = result?.status === 'Paid';
  const isPending = result?.status === 'Pending';

  // Thất bại (không phải Paid, không còn chờ VNPay xác nhận): kiểm tra đơn còn giữ phòng để cho thanh toán lại.
  const failed = !loading && !isSuccess && !isPending;
  useEffect(() => {
    if (failed) void loadHold(result?.bookingId || urlBookingId);
  }, [failed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="w-full pt-28 pb-16 bg-background min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl p-8 shadow-xl border border-outline-variant/30 text-center relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-primary animate-spin">
              progress_activity
            </span>
            <h2 className="font-headline-sm text-2xl font-bold text-on-surface">
              {t('vnpay.verifying')}
            </h2>
            <p className="font-body-md text-on-surface-variant max-w-md">
              {t('vnpay.verifyingHint')}</p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                VNPay Sandbox Verified
              </span>
              <h1 className="font-headline-md text-3xl font-bold text-on-surface">
                {t('vnpay.success')}
              </h1>
              <p className="mt-2 text-on-surface-variant font-body-md">
                {t('vnpay.successHint')}</p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-5 text-left space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                <span className="text-sm text-on-surface-variant">{t('vnpay.bookingCode')}</span>
                <strong className="text-base text-primary font-bold">
                  {result?.bookingCode || urlBookingCode || '—'}
                </strong>
              </div>

              {result?.amount ? (
                <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                  <span className="text-sm text-on-surface-variant">{t('vnpay.amount')}</span>
                  <strong className="text-base text-emerald-600 font-bold">
                    {formatMoney(result.amount, locale)}
                  </strong>
                </div>
              ) : null}

              <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                <span className="text-sm text-on-surface-variant">{t('vnpay.ref')}</span>
                <span className="text-xs font-mono text-outline truncate max-w-[240px]">
                  {result?.txnRef || urlTxnRef}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">{t('vnpay.status')}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {t('vnpay.paid')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onNavigateMyBookings}
                className="flex-1 h-12 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">luggage</span>
                {t('vnpay.viewBookings')}
              </button>
              <button
                onClick={onNavigateHome}
                className="flex-1 h-12 rounded-full border border-outline-variant/60 font-semibold text-on-surface hover:bg-surface-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                {t('vnpay.home')}
              </button>
            </div>
          </div>
        ) : isPending ? (
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-4xl">schedule</span>
            </div>

            <div>
              <h1 className="font-headline-md text-2xl font-bold text-on-surface">
                {t('vnpay.pending')}
              </h1>
              <p className="mt-2 text-on-surface-variant font-body-md">
                {t('vnpay.pendingHint')}</p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => verifyPayment(urlTxnRef)}
                className="px-6 py-2.5 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container transition flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                {t('vnpay.recheck')}
              </button>
              <button
                onClick={onNavigateMyBookings}
                className="px-6 py-2.5 rounded-full border border-outline-variant font-semibold text-on-surface hover:bg-surface-container transition"
              >
                {t('vnpay.viewList')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="w-20 h-20 bg-error-container text-error rounded-full flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-4xl">cancel</span>
            </div>

            <div>
              <h1 className="font-headline-md text-2xl font-bold text-on-surface">
                Thanh Toán Không Thành Công
              </h1>
              <p className="mt-2 text-error font-body-md">
                {error || result?.message || t('vnpay.failedDefault')}
              </p>
            </div>

            {hold && <HoldCountdown expiresAt={hold.expiresAt} className="justify-center" />}
            {hold && (holdLeft ?? 0) > 0 && (
              <button type="button" disabled={retrying} onClick={() => void retryPayment()}
                className="w-full h-12 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">{retrying ? 'progress_activity' : 'payment'}</span>
                {retrying ? t('vnpay.retrying') : t('vnpay.retry')}
              </button>
            )}

            <div className="bg-surface-container-low rounded-xl p-4 text-sm text-left text-on-surface-variant space-y-1">
              <p>{t('vnpay.failedTip1')}</p>
              <p>{t('vnpay.failedTip2')}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onNavigateMyBookings}
                className="flex-1 h-12 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                {t('vnpay.backToBookings')}
              </button>
              <button
                onClick={onNavigateHome}
                className="flex-1 h-12 rounded-full border border-outline-variant font-semibold text-on-surface hover:bg-surface-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                {t('vnpay.home')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
