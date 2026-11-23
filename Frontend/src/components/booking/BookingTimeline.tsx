import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';

export interface TimelineStatus { oldStatus: string | null; newStatus: string; changedAt: string; changedBy: string; note: string | null }
export interface TimelinePayment { paymentId: number; method: 'Deposit' | 'Cash' | string; type: 'Payment' | 'Refund' | string; amount: number; status: string; transactionCode: string | null; paidAt: string | null; createdAt: string }
export interface BookingTimelineData { statusHistory: TimelineStatus[]; payments: TimelinePayment[] }

export const getBookingTimeline = (bookingId: number | string) =>
  apiClient<BookingTimelineData>(`/api/bookings/${bookingId}/timeline`);

type Lang = 'vi' | 'en';
const TEXT = {
  vi: {
    payments: 'Giao dịch thanh toán', history: 'Lịch sử trạng thái', loading: 'Đang tải…', error: 'Không tải được lịch sử đơn.',
    noPayments: 'Chưa có giao dịch nào.', noHistory: 'Chưa có thay đổi trạng thái.', created: 'Tạo đơn',
    deposit: 'Đặt cọc VNPay', cash: 'Thu tại khách sạn', refund: 'Hoàn tiền',
    status: { Pending: 'Chờ thanh toán', Paid: 'Thành công', Failed: 'Thất bại', Refunded: 'Đã hoàn', RefundPending: 'Chờ hoàn' } as Record<string, string>,
    booking: { Pending: 'Chờ xác nhận', Confirmed: 'Đã xác nhận', CheckedIn: 'Đã nhận phòng', CheckedOut: 'Đã trả phòng', Completed: 'Hoàn tất', Cancelled: 'Đã hủy', NoShow: 'Không đến' } as Record<string, string>,
    by: 'bởi',
  },
  en: {
    payments: 'Payments', history: 'Status history', loading: 'Loading…', error: 'Could not load booking history.',
    noPayments: 'No transactions yet.', noHistory: 'No status changes yet.', created: 'Booking created',
    deposit: 'VNPay deposit', cash: 'Paid at hotel', refund: 'Refund',
    status: { Pending: 'Pending', Paid: 'Successful', Failed: 'Failed', Refunded: 'Refunded', RefundPending: 'Refund pending' } as Record<string, string>,
    booking: { Pending: 'Pending', Confirmed: 'Confirmed', CheckedIn: 'Checked in', CheckedOut: 'Checked out', Completed: 'Completed', Cancelled: 'Cancelled', NoShow: 'No-show' } as Record<string, string>,
    by: 'by',
  },
};

const STATUS_TONE: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700', Refunded: 'bg-violet-50 text-violet-700', RefundPending: 'bg-amber-50 text-amber-800',
  Failed: 'bg-rose-50 text-rose-700', Pending: 'bg-surface-container text-on-surface-variant',
};

interface Props {
  bookingId: number | string;
  lang?: Lang;
  /** Đổi giá trị này để tải lại (VD sau khi thu tiền/check-in). */
  refreshKey?: unknown;
  sectionClassName?: string;
}

/** Danh sách giao dịch + lịch sử trạng thái của một đơn. */
export const BookingTimeline: React.FC<Props> = ({ bookingId, lang = 'vi', refreshKey, sectionClassName = '' }) => {
  const tx = TEXT[lang];
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [data, setData] = useState<BookingTimelineData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    getBookingTimeline(bookingId).then(res => {
      if (!alive) return;
      if (res.success && res.data) setData(res.data); else setError(res.message || tx.error);
    }).catch(() => alive && setError(tx.error));
    return () => { alive = false; };
  }, [bookingId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const money = (n: number) => new Intl.NumberFormat(locale).format(n) + ' ₫';
  const when = (iso: string) => new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
    .toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (error) return <p className={`text-sm text-on-surface-variant ${sectionClassName}`}>{error}</p>;
  if (!data) return <p role="status" className={`text-sm text-on-surface-variant ${sectionClassName}`}>{tx.loading}</p>;

  return (
    <>
      <div className={sectionClassName}>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">{tx.payments}</h3>
        {!data.payments.length ? <p className="text-sm text-on-surface-variant">{tx.noPayments}</p> : (
          <ul className="space-y-2.5">
            {data.payments.map(p => {
              const isRefund = p.type === 'Refund';
              return (
                <li key={p.paymentId} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isRefund ? 'bg-violet-50 text-violet-700' : 'bg-surface-container-low text-primary'}`}>
                    <span className="material-symbols-outlined text-[17px]">{isRefund ? 'undo' : p.method === 'Cash' ? 'payments' : 'credit_card'}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-on-surface">{isRefund ? tx.refund : p.method === 'Cash' ? tx.cash : tx.deposit}</span>
                      <span className={`font-semibold tabular-nums ${isRefund ? 'text-violet-700' : 'text-on-surface'}`}>{isRefund ? '−' : ''}{money(p.amount)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_TONE[p.status] ?? STATUS_TONE.Pending}`}>{tx.status[p.status] ?? p.status}</span>
                      <span>{when(p.paidAt ?? p.createdAt)}</span>
                      {p.transactionCode && <span className="font-mono">{p.transactionCode}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={sectionClassName}>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">{tx.history}</h3>
        {!data.statusHistory.length ? <p className="text-sm text-on-surface-variant">{tx.noHistory}</p> : (
          <ol className="relative ml-1.5 space-y-3 border-l border-outline-variant/50 pl-5">
            {data.statusHistory.map((h, i) => (
              <li key={i} className="relative text-sm">
                <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface-container-lowest ${i === data.statusHistory.length - 1 ? 'bg-primary' : 'bg-outline-variant'}`} />
                <p className="font-medium text-on-surface">
                  {h.oldStatus ? <>{tx.booking[h.oldStatus] ?? h.oldStatus} → </> : <>{tx.created} · </>}{tx.booking[h.newStatus] ?? h.newStatus}
                </p>
                <p className="text-xs text-on-surface-variant">{when(h.changedAt)} · {tx.by} {h.changedBy}</p>
                {h.note && <p className="mt-0.5 text-xs text-on-surface-variant">{h.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
};
export default BookingTimeline;
