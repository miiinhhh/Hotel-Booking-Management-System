import React, { useEffect, useState } from 'react';
import { getPaymentStatusByTxnRef, VnPayCallbackResult } from '../../services/paymentApi';

interface VnPayReturnPageProps {
  onNavigateHome: () => void;
  onNavigateMyBookings: () => void;
}

export const VnPayReturnPage: React.FC<VnPayReturnPageProps> = ({
  onNavigateHome,
  onNavigateMyBookings,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VnPayCallbackResult | null>(null);

  // Parse query parameters from URL
  const query = new URLSearchParams(window.location.search);
  const urlTxnRef = query.get('txnRef') || '';
  const urlBookingCode = query.get('bookingCode') || '';

  const verifyPayment = async (txnRef: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!txnRef) {
        setError('Không tìm thấy thông tin tham chiếu giao dịch (txnRef) trong liên kết.');
        return;
      }

      const res = await getPaymentStatusByTxnRef(txnRef);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.message || 'Không thể xác thực trạng thái giao dịch từ máy chủ.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi xác thực thanh toán.');
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
              Đang xác thực giao dịch...
            </h2>
            <p className="font-body-md text-on-surface-variant max-w-md">
              Hệ thống đang đối chiếu chữ ký số và xác nhận kết quả thanh toán với cổng VNPay.
            </p>
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
                Thanh Toán Đặt Cọc Thành Công!
              </h1>
              <p className="mt-2 text-on-surface-variant font-body-md">
                Đơn đặt phòng của bạn đã được xác nhận tự động. Tiền cọc đã được ghi nhận vào hệ thống.
              </p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-5 text-left space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                <span className="text-sm text-on-surface-variant">Mã đặt phòng</span>
                <strong className="text-base text-primary font-bold">
                  {result?.bookingCode || urlBookingCode || 'BK-STAYLUXE'}
                </strong>
              </div>

              {result?.amount ? (
                <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                  <span className="text-sm text-on-surface-variant">Số tiền đã cọc</span>
                  <strong className="text-base text-emerald-600 font-bold">
                    {result.amount.toLocaleString('vi-VN')} ₫
                  </strong>
                </div>
              ) : null}

              <div className="flex justify-between items-center pb-2 border-b border-surface-container">
                <span className="text-sm text-on-surface-variant">Mã tham chiếu VNPay</span>
                <span className="text-xs font-mono text-outline truncate max-w-[240px]">
                  {result?.txnRef || urlTxnRef}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Trạng thái thanh toán</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Đã thanh toán (Paid)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onNavigateMyBookings}
                className="flex-1 h-12 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">luggage</span>
                Xem đơn đặt phòng của tôi
              </button>
              <button
                onClick={onNavigateHome}
                className="flex-1 h-12 rounded-full border border-outline-variant/60 font-semibold text-on-surface hover:bg-surface-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                Về trang chủ
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
                Đang chờ ngân hàng xử lý
              </h1>
              <p className="mt-2 text-on-surface-variant font-body-md">
                Giao dịch của bạn đang ở trạng thái chờ xác nhận từ ngân hàng hoặc VNPay.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => verifyPayment(urlTxnRef)}
                className="px-6 py-2.5 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container transition flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Kiểm tra lại
              </button>
              <button
                onClick={onNavigateMyBookings}
                className="px-6 py-2.5 rounded-full border border-outline-variant font-semibold text-on-surface hover:bg-surface-container transition"
              >
                Xem danh sách đơn
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
                {error || result?.message || 'Giao dịch bị hủy bởi khách hàng hoặc ngân hàng từ chối giao dịch.'}
              </p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-4 text-sm text-left text-on-surface-variant space-y-1">
              <p>• Vui lòng kiểm tra lại số dư tài khoản ngân hàng hoặc thông tin thẻ.</p>
              <p>• Bạn có thể thực hiện thanh toán lại trong mục "Đặt phòng của tôi".</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onNavigateMyBookings}
                className="flex-1 h-12 rounded-full bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Quay lại đơn đặt phòng
              </button>
              <button
                onClick={onNavigateHome}
                className="flex-1 h-12 rounded-full border border-outline-variant font-semibold text-on-surface hover:bg-surface-container transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
