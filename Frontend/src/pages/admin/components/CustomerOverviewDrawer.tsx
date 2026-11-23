import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/apiClient';
import { formatVnd } from '../../../utils/formatters';
import { parseReviewComment } from '../../booking-history/reviewFormat';

/** Dòng dữ liệu thô từ GET /api/admin/users/{id}/overview (khóa giữ nguyên PascalCase). */
interface BookingRow { BookingId: number; BookingCode: string; HotelName: string | null; CheckInDate: string; CheckOutDate: string; BookingStatus: string; PaymentStatus: string; TotalAmount: number; RemainingAmount: number; CreatedAt: string }
interface PaymentRow { PaymentId: number; BookingCode: string; PaymentMethod: string; PaymentType: string; Amount: number; Status: string; TransactionCode: string | null; PaidAt: string | null; CreatedAt: string }
interface ReviewRow { ReviewId: number; BookingCode: string; HotelName: string | null; Rating: number; Comment: string | null; Status: string; CreatedAt: string }
interface WishRow { HotelId: number; HotelName: string; City: string; CreatedAt: string }
interface Overview { bookings: BookingRow[]; payments: PaymentRow[]; reviews: ReviewRow[]; wishlist: WishRow[] }

const BOOKING_VI: Record<string, string> = { Pending: 'Chờ xác nhận', Confirmed: 'Đã xác nhận', CheckedIn: 'Đang lưu trú', CheckedOut: 'Đã trả phòng', Completed: 'Hoàn tất', Cancelled: 'Đã hủy', NoShow: 'Không đến' };
const PAY_VI: Record<string, string> = { Pending: 'Chờ thanh toán', Paid: 'Thành công', Failed: 'Thất bại', Refunded: 'Đã hoàn', RefundPending: 'Chờ hoàn' };
const REVIEW_VI: Record<string, string> = { Visible: 'Đang hiển thị', Hidden: 'Đang ẩn', Deleted: 'Khách đã xóa' };
const day = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('vi-VN');
const dateTime = (iso: string) => new Date(/Z|\+/.test(iso) ? iso : iso + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Tab = 'bookings' | 'payments' | 'reviews' | 'wishlist';

interface Props {
  user: { userId: number; fullName: string; email: string; phone?: string | null } | null;
  onClose: () => void;
}

export const CustomerOverviewDrawer: React.FC<Props> = ({ user, onClose }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('bookings');

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setData(null); setError(''); setTab('bookings');
    apiClient<Overview>(`/api/admin/users/${user.userId}/overview`).then(res => {
      if (!alive) return;
      if (res.success && res.data) setData(res.data); else setError(res.message || 'Không tải được hồ sơ khách hàng.');
    });
    return () => { alive = false; };
  }, [user]);

  if (!user) return null;
  const spent = data?.bookings.filter(b => b.BookingStatus !== 'Cancelled').reduce((sum, b) => sum + (b.TotalAmount - b.RemainingAmount), 0) ?? 0;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'bookings', label: 'Đặt phòng', count: data?.bookings.length },
    { id: 'payments', label: 'Giao dịch', count: data?.payments.length },
    { id: 'reviews', label: 'Đánh giá', count: data?.reviews.length },
    { id: 'wishlist', label: 'Yêu thích', count: data?.wishlist.length },
  ];
  const row = 'rounded-2xl bg-surface-container-lowest p-4 shadow-sm';

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-label={`Hồ sơ ${user.fullName}`} className="relative flex h-full w-full max-w-xl flex-col bg-surface-container-low shadow-2xl">
        <header className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-on-surface">{user.fullName}</h2>
            <p className="text-sm text-on-surface-variant">{user.email}{user.phone ? ` · ${user.phone}` : ''} · ID #{user.userId}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
        </header>

        {data && (
          <div className="grid grid-cols-3 gap-3 px-6 pb-3 text-center">
            {[[data.bookings.length, 'Đơn đặt phòng'], [data.bookings.filter(b => b.BookingStatus === 'Completed').length, 'Lượt hoàn tất'], [formatVnd(spent), 'Đã chi trả']].map(([v, l]) => (
              <div key={String(l)} className="rounded-2xl bg-surface-container-lowest p-3 shadow-sm"><p className="font-bold text-on-surface">{v}</p><p className="text-xs text-on-surface-variant">{l}</p></div>
            ))}
          </div>
        )}

        <div className="flex gap-1 px-6 pb-3" role="tablist">
          {tabs.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}>
              {t.label}{t.count != null && <span className="ml-1 opacity-80">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-6 pb-8">
          {error && <p role="alert" className="rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}
          {!data && !error && <p role="status" className="p-8 text-center text-sm text-on-surface-variant">Đang tải…</p>}

          {data && tab === 'bookings' && (data.bookings.length ? data.bookings.map(b => (
            <div key={b.BookingId} className={row}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{b.BookingCode}</span>
                <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">{BOOKING_VI[b.BookingStatus] ?? b.BookingStatus}</span>
              </div>
              <p className="mt-1 text-sm text-on-surface">{b.HotelName ?? '—'}</p>
              <div className="mt-1 flex justify-between text-xs text-on-surface-variant">
                <span>{day(b.CheckInDate)} → {day(b.CheckOutDate)}</span>
                <span><b className="text-on-surface">{formatVnd(b.TotalAmount)}</b>{b.RemainingAmount > 0 && b.BookingStatus !== 'Cancelled' ? ` · còn ${formatVnd(b.RemainingAmount)}` : ''}</span>
              </div>
            </div>
          )) : <Empty text="Chưa có đơn đặt phòng." />)}

          {data && tab === 'payments' && (data.payments.length ? data.payments.map(p => (
            <div key={p.PaymentId} className={`${row} flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-on-surface">{p.PaymentType === 'Refund' ? 'Hoàn tiền' : p.PaymentMethod === 'Cash' ? 'Thu tại khách sạn' : 'Đặt cọc VNPay'} · <span className="font-mono text-xs">{p.BookingCode}</span></p>
                <p className="text-xs text-on-surface-variant">{dateTime(p.PaidAt ?? p.CreatedAt)} · {PAY_VI[p.Status] ?? p.Status}{p.TransactionCode ? ` · ${p.TransactionCode}` : ''}</p>
              </div>
              <span className={`shrink-0 font-semibold tabular-nums ${p.PaymentType === 'Refund' ? 'text-violet-700' : 'text-on-surface'}`}>{p.PaymentType === 'Refund' ? '−' : ''}{formatVnd(p.Amount)}</span>
            </div>
          )) : <Empty text="Chưa có giao dịch." />)}

          {data && tab === 'reviews' && (data.reviews.length ? data.reviews.map(r => (
            <div key={r.ReviewId} className={row}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-sm font-semibold text-on-surface">{r.Rating}<span className="material-symbols-outlined text-[15px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> · {r.HotelName ?? '—'}</span>
                <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">{REVIEW_VI[r.Status] ?? r.Status}</span>
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-on-surface-variant">{parseReviewComment(r.Comment).comment || <i>Không có bình luận.</i>}</p>
              <p className="mt-1 text-xs text-outline">{r.BookingCode} · {dateTime(r.CreatedAt)}</p>
            </div>
          )) : <Empty text="Chưa có đánh giá." />)}

          {data && tab === 'wishlist' && (data.wishlist.length ? data.wishlist.map(w => (
            <div key={w.HotelId} className={`${row} flex items-center gap-3`}>
              <span className="material-symbols-outlined text-rose-500" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-on-surface">{w.HotelName}</p><p className="text-xs text-on-surface-variant">{w.City}</p></div>
              <span className="text-xs text-outline">Lưu {day(w.CreatedAt)}</span>
            </div>
          )) : <Empty text="Chưa lưu khách sạn yêu thích." />)}
        </div>
      </section>
    </div>
  );
};

const Empty: React.FC<{ text: string }> = ({ text }) => <p className="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">{text}</p>;
export default CustomerOverviewDrawer;
