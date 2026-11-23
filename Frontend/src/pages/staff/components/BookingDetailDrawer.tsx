import { BookingTimeline } from '../../../components/booking/BookingTimeline';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import { StaffBooking } from '../types';
import { RescheduleDialog } from '../../../components/booking/RescheduleDialog';
import { markNoShow } from '../../../services/staffPortalApi';
import { refundVnPayPayment, confirmManualRefund, confirmCashPayment } from '../../../services/paymentApi';
import { PAYMENT_UI, PaidBar, shortDate, StatusBadge, viDate, vnd } from './staffUi';

interface BookingDetailDrawerProps {
  booking: StaffBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: (booking: StaffBooking) => void | Promise<void>;
  /** Trả phòng: chuyển đơn sang Hoàn tất (khách có thể đánh giá). */
  onCheckOut?: (booking: StaffBooking) => void | Promise<void>;
  /** Sau khi ghi nhận khách không đến (đơn bị hủy). */
  onNoShow?: (booking: StaffBooking) => void;
  onCancelBooking: (booking: StaffBooking) => void | Promise<void>;
  onUpdateNotes?: (bookingId: string, notes: string, approval: 'accepted' | 'rejected') => void;
  onRefundBooking?: (booking: StaffBooking, message: string) => void;
  onConfirmPayment?: (booking: StaffBooking) => void;
  /** Sau khi đổi lịch thành công (tải lại danh sách + thông báo). */
  onRescheduled?: (message: string) => void;
}

/** Thao tác cần xác nhận trước khi gọi máy chủ. */
type Pending = 'checkin' | 'checkout' | 'noshow' | 'cash' | 'refund-vnpay' | 'refund-manual' | 'cancel';

/**
 * Panel chi tiết đơn cho lễ tân: khách · lưu trú · thanh toán · yêu cầu đặc biệt,
 * và thanh thao tác dưới cùng chỉ hiện đúng bước kế tiếp theo trạng thái + quyền.
 */
export const BookingDetailDrawer: React.FC<BookingDetailDrawerProps> = ({
  booking, isOpen, onClose, onCheckIn, onCheckOut, onNoShow, onCancelBooking, onRefundBooking, onConfirmPayment, onRescheduled,
}) => {
  const { hasPermission } = useAuth();
  const canManageBooking = hasPermission(PERMISSIONS.bookingManage);
  const canManagePayment = hasPermission(PERMISSIONS.paymentManage);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  useEffect(() => { setPending(null); setError(''); setCopied(false); }, [booking?.id]);

  // Đóng bằng phím Esc (trừ khi đang xử lý).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { if (pending) setPending(null); else onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, pending, onClose]);

  if (!isOpen || !booking) return null;

  const id = Number(booking.id);
  const cancelled = booking.status === 'cancelled';
  const owing = booking.remainingAmount > 0 && !cancelled;
  const refundPending = booking.depositStatus === 'refund_pending';
  const refunded = booking.depositStatus === 'refunded';
  const refundAmount = booking.refundAmount ?? booking.paidAmount;
  const pay = PAYMENT_UI[booking.depositStatus];

  const copyCode = () => {
    void navigator.clipboard?.writeText(booking.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /** Chạy thao tác đã xác nhận; lỗi hiện ngay trong panel thay vì alert(). */
  const run = async () => {
    if (!pending) return;
    if (!id || Number.isNaN(id)) { setError('Mã đơn không hợp lệ.'); return; }
    setBusy(true); setError('');
    try {
      if (pending === 'checkin') {
        await onCheckIn(booking);
      } else if (pending === 'noshow') {
        const res = await markNoShow(id, 'Lễ tân ghi nhận khách không đến.');
        if (!res.success) throw new Error(res.message || 'Không ghi nhận được khách vắng mặt.');
        onNoShow?.(booking);
      } else if (pending === 'checkout') {
        await onCheckOut?.(booking);
      } else if (pending === 'cancel') {
        await onCancelBooking(booking);
      } else if (pending === 'cash') {
        const res = await confirmCashPayment(id);
        if (!res.success) throw new Error(res.message || 'Không thể xác nhận thu tiền.');
        onConfirmPayment?.({ ...booking, paidAmount: booking.totalAmount, remainingAmount: 0, depositStatus: 'paid_100', depositStatusLabel: 'Đã thanh toán đủ' });
      } else {
        const res = pending === 'refund-vnpay' ? await refundVnPayPayment(id) : await confirmManualRefund(id);
        if (!res.success) throw new Error(res.message || (pending === 'refund-vnpay' ? 'Cổng VNPay từ chối giao dịch.' : 'Không thể xác nhận hoàn tiền.'));
        onRefundBooking?.(
          { ...booking, depositStatus: 'refunded', depositStatusLabel: 'Đã hoàn tiền', status: 'cancelled', statusLabel: 'Đã hủy' },
          pending === 'refund-vnpay' ? 'Đã gửi lệnh hoàn tiền qua VNPay' : 'Đã xác nhận hoàn tiền thủ công',
        );
      }
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  /** Nội dung hộp xác nhận cho từng thao tác. */
  const confirmCopy: Record<Pending, { title: string; body: React.ReactNode; cta: string; danger?: boolean }> = {
    checkin: {
      title: `Check-in phòng ${booking.roomNumber}?`,
      body: owing
        ? <p className="rounded bg-amber-50 p-3 text-amber-900"><b>Chưa thu đủ tiền:</b> đơn còn thiếu <b>{vnd(booking.remainingAmount)}</b>. Bạn vẫn muốn cho khách nhận phòng?</p>
        : <p>Xác nhận khách <b>{booking.customerName}</b> đã nhận phòng.</p>,
      cta: owing ? 'Vẫn check-in' : 'Check-in',
    },
    noshow: {
      title: `Khách không đến · ${booking.bookingCode}?`,
      body: <p>Đơn sẽ bị <b>hủy (No-show)</b> và phòng được mở bán lại.{booking.paidAmount > 0 && <> Khoản đã thanh toán <b>{vnd(booking.paidAmount)}</b> không được hoàn theo quy định no-show.</>}</p>,
      cta: 'Ghi nhận không đến', danger: true,
    },
    checkout: {
      title: `Check-out phòng ${booking.roomNumber}?`,
      body: owing
        ? <p className="rounded bg-amber-50 p-3 text-amber-900"><b>Chưa thu đủ tiền:</b> đơn còn thiếu <b>{vnd(booking.remainingAmount)}</b>. Hãy thu tiền trước khi trả phòng, hoặc xác nhận vẫn check-out.</p>
        : <p>Xác nhận khách <b>{booking.customerName}</b> đã trả phòng. Đơn chuyển sang <b>Đã trả phòng</b> và khách có thể viết đánh giá kỳ nghỉ.</p>,
      cta: owing ? 'Vẫn check-out' : 'Check-out',
      danger: owing,
    },
    cash: {
      title: 'Xác nhận đã thu tiền tại quầy',
      body: <dl className="space-y-1.5 rounded bg-surface-container-low p-3">
        <div className="flex justify-between"><dt className="text-on-surface-variant">Tổng tiền</dt><dd>{vnd(booking.totalAmount)}</dd></div>
        <div className="flex justify-between"><dt className="text-on-surface-variant">Đã thanh toán</dt><dd>{vnd(booking.paidAmount)}</dd></div>
        <div className="flex justify-between border-t border-outline-variant/40 pt-1.5 font-semibold"><dt>Thu tiền mặt / thẻ</dt><dd className="text-primary">{vnd(booking.remainingAmount)}</dd></div>
      </dl>,
      cta: 'Đã thu đủ',
    },
    'refund-vnpay': {
      title: 'Hoàn tiền qua VNPay',
      body: <p>Gửi lệnh hoàn <b>{vnd(refundAmount)}</b> về tài khoản thanh toán của khách qua cổng VNPay.</p>,
      cta: 'Gửi lệnh hoàn tiền',
    },
    'refund-manual': {
      title: 'Xác nhận đã hoàn tiền thủ công',
      body: <p>Chỉ xác nhận khi đã trả <b>{vnd(refundAmount)}</b> cho khách bằng tiền mặt hoặc chuyển khoản ngoài hệ thống.</p>,
      cta: 'Đã hoàn tiền',
    },
    cancel: {
      title: `Hủy đơn ${booking.bookingCode}?`,
      body: <p>Đơn đã thanh toán <b>{vnd(booking.paidAmount)}</b>. Phí hủy và số tiền hoàn được tính theo chính sách hủy của khách sạn. Thao tác này không hoàn tác được.</p>,
      cta: 'Hủy đơn', danger: true,
    },
  };

  // Từ ngày nhận phòng trở đi mà khách chưa check-in → cho phép ghi nhận không đến.
  const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = isoOf(new Date());
  // Check-in hợp lệ: từ (ngày nhận phòng − 1 ngày, cho nhận sớm) tới trước ngày trả phòng — khớp kiểm tra ở backend.
  const earliestCheckIn = (() => { const d = new Date(`${booking.checkInDate.slice(0, 10)}T00:00:00`); d.setDate(d.getDate() - 1); return isoOf(d); })();
  const checkInTooEarly = todayIso < earliestCheckIn;
  const checkInTooLate = todayIso >= booking.checkOutDate.slice(0, 10);
  const checkInBlockedNote = booking.status === 'confirmed_deposit' && canManageBooking && (checkInTooEarly || checkInTooLate)
    ? (checkInTooEarly ? `Nhận phòng từ ${shortDate(earliestCheckIn)} (cho phép sớm 1 ngày).` : 'Đã qua ngày trả phòng, không thể check-in.')
    : null;
  const canNoShow = canManageBooking && Boolean(onNoShow) && (booking.status === 'pending_deposit' || booking.status === 'confirmed_deposit') && booking.checkInDate.slice(0, 10) <= todayIso;
  const canCheckOut = booking.status === 'checked_in' && canManageBooking && Boolean(onCheckOut);

  /** Thao tác chính ở thanh dưới, theo đúng bước kế tiếp. */
  const primary: { label: string; icon: string; action: Pending } | null =
    refundPending && canManagePayment ? { label: 'Hoàn tiền qua VNPay', icon: 'currency_exchange', action: 'refund-vnpay' }
      : booking.status === 'confirmed_deposit' && canManageBooking && !checkInBlockedNote ? { label: `Check-in · ${booking.roomNumber}`, icon: 'key', action: 'checkin' }
      : owing && canManagePayment ? { label: `Thu ${vnd(booking.remainingAmount)}`, icon: 'point_of_sale', action: 'cash' }
      : canCheckOut ? { label: `Check-out · ${booking.roomNumber}`, icon: 'logout', action: 'checkout' }
      : null;

  const secondary: { label: string; icon: string; action: Pending; danger?: boolean }[] = [];
  if (canNoShow) secondary.push({ label: 'Khách không đến', icon: 'person_off', action: 'noshow', danger: true });
  if (canCheckOut && primary?.action !== 'checkout') secondary.push({ label: 'Check-out', icon: 'logout', action: 'checkout' });
  if (refundPending && canManagePayment) secondary.push({ label: 'Đã hoàn tiền thủ công', icon: 'receipt_long', action: 'refund-manual' });
  if (owing && canManagePayment && primary?.action !== 'cash') secondary.push({ label: `Thu ${vnd(booking.remainingAmount)}`, icon: 'point_of_sale', action: 'cash' });
  if (canManageBooking && (booking.status === 'pending_deposit' || booking.status === 'confirmed_deposit')) secondary.push({ label: 'Hủy đơn', icon: 'block', action: 'cancel', danger: true });

  const canReschedule = canManageBooking && Boolean(onRescheduled) && (booking.status === 'pending_deposit' || booking.status === 'confirmed_deposit');

  const section = 'border-b border-outline-variant/40 px-6 py-5 last:border-b-0';
  const label = 'text-xs text-on-surface-variant';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-inverse-surface/35 backdrop-blur-[2px]" onClick={() => { if (!busy) onClose(); }} aria-hidden="true" />

      <section role="dialog" aria-modal="true" aria-labelledby="booking-drawer-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-surface-container-lowest shadow-2xl animate-in slide-in-from-right duration-200">
        {/* ===== Đầu panel ===== */}
        <header className="border-b border-outline-variant/40 px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="booking-drawer-title" className="text-2xl font-semibold tracking-tight text-on-surface">{booking.bookingCode}</h2>
                <button type="button" onClick={copyCode} title="Sao chép mã đơn" aria-label="Sao chép mã đơn"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
                  <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
                </button>
                <StatusBadge status={booking.status} />
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">Tạo lúc {booking.createdAt}{booking.lastUpdated ? ` · cập nhật ${booking.lastUpdated}` : ''}</p>
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label="Đóng"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-40">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        {/* ===== Nội dung ===== */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p role="alert" className="mx-6 mt-4 flex items-start justify-between gap-3 rounded bg-error-container p-3 text-sm text-on-error-container">
              <span>{error}</span><button type="button" onClick={() => setError('')} className="font-semibold">Đóng</button>
            </p>
          )}

          {/* Khách hàng */}
          <div className={section}>
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Khách hàng</h3>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed/50 font-bold text-primary">{booking.customerInitials}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface">{booking.customerName}</p>
                <p className="truncate text-sm text-on-surface-variant">{booking.customerEmail}</p>
              </div>
              {booking.customerPhone && booking.customerPhone !== 'Chưa cập nhật' && (
                <a href={`tel:${booking.customerPhone}`} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-sm font-medium hover:bg-surface-container">
                  <span className="material-symbols-outlined text-[18px] text-primary">call</span>{booking.customerPhone}
                </a>
              )}
            </div>
          </div>

          {/* Lưu trú */}
          <div className={section}>
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Lưu trú</h3>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded bg-surface-container-low p-4">
              <div>
                <p className={label}>Nhận phòng</p>
                <p className="mt-0.5 font-semibold text-on-surface">{viDate(booking.checkInDate)}</p>
                {booking.checkInTime && <p className="text-xs text-on-surface-variant">{booking.checkInTime}</p>}
              </div>
              <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-on-surface-variant">{booking.nightsCount} đêm</span>
              <div className="text-right">
                <p className={label}>Trả phòng</p>
                <p className="mt-0.5 font-semibold text-on-surface">{viDate(booking.checkOutDate)}</p>
                {booking.checkOutTime && <p className="text-xs text-on-surface-variant">{booking.checkOutTime}</p>}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className={label}>Phòng</dt><dd className="font-semibold text-on-surface">{booking.roomNumber}</dd></div>
              <div><dt className={label}>Hạng phòng</dt><dd className="text-on-surface">{booking.roomType}</dd></div>
              <div><dt className={label}>Phân khu</dt><dd className="text-on-surface">{booking.zone}</dd></div>
              <div><dt className={label}>Số khách · số phòng</dt><dd className="text-on-surface">{booking.roomDetails}</dd></div>
            </dl>
          </div>

          {/* Thanh toán */}
          <div className={section}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">Thanh toán</h3>
              <span className={`text-xs ${pay.className}`}>{pay.label}</span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-on-surface-variant">Tổng tiền</dt><dd className="font-semibold tabular-nums text-on-surface">{vnd(booking.totalAmount)}</dd></div>
              {booking.depositAmount ? <div className="flex justify-between"><dt className="text-on-surface-variant">Tiền cọc</dt><dd className="tabular-nums text-on-surface">{vnd(booking.depositAmount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-on-surface-variant">Đã thanh toán</dt><dd className="tabular-nums text-emerald-700">{vnd(booking.paidAmount)}</dd></div>
              {(refundPending || refunded) && (
                <div className="flex justify-between"><dt className="text-on-surface-variant">Hoàn theo chính sách hủy</dt><dd className="font-semibold tabular-nums text-on-surface">{vnd(refundAmount)}</dd></div>
              )}
              {!cancelled && <PaidBar paid={booking.paidAmount} total={booking.totalAmount} />}
              {!cancelled && (
                <div className="flex justify-between border-t border-outline-variant/40 pt-2">
                  <dt className="font-semibold text-on-surface">Còn phải thu</dt>
                  <dd className={`font-bold tabular-nums ${owing ? 'text-primary' : 'text-on-surface-variant'}`}>{vnd(booking.remainingAmount)}</dd>
                </div>
              )}
              {booking.transactionCode && (
                <div className="flex justify-between"><dt className="text-on-surface-variant">Mã giao dịch</dt><dd className="font-mono text-xs">{booking.transactionCode}</dd></div>
              )}
            </dl>
            {refundPending && (
              <p className="mt-3 flex items-start gap-2 rounded bg-amber-50 p-3 text-sm text-amber-900">
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                <span>Đơn đã hủy, đang chờ hoàn <b>{vnd(refundAmount)}</b> cho khách qua VNPay hoặc trả trực tiếp.</span>
              </p>
            )}
            {refunded && (
              <p className="mt-3 flex items-center gap-2 rounded bg-violet-50 p-3 text-sm text-violet-800">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>Đã hoàn {vnd(refundAmount)} cho khách.
              </p>
            )}
          </div>

          <BookingTimeline bookingId={booking.id} refreshKey={`${booking.status}|${booking.paidAmount}|${booking.depositStatus}`} sectionClassName={section} />

          {/* Yêu cầu đặc biệt — chỉ hiện khi khách có ghi */}
          {booking.specialRequests && (
            <div className={section}>
              <h3 className="mb-2 text-sm font-semibold text-on-surface">Yêu cầu của khách</h3>
              <p className="rounded bg-surface-container-low p-3 text-sm leading-6 text-on-surface">{booking.specialRequests}</p>
            </div>
          )}
        </div>

        {/* ===== Thanh thao tác ===== */}
        {checkInBlockedNote && (
          <p className="flex items-center gap-2 border-t border-outline-variant/40 bg-surface-container-low px-6 py-3 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary">event</span>{checkInBlockedNote}
          </p>
        )}
        {(primary || secondary.length > 0 || canReschedule) && (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/40 px-6 py-4">
            <div className="flex flex-wrap gap-1">
              {canReschedule && (
                <button type="button" disabled={busy} onClick={() => setRescheduleOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">event_repeat</span>Đổi lịch
                </button>
              )}
              {secondary.map(s => (
                <button key={s.action} type="button" disabled={busy} onClick={() => { setError(''); setPending(s.action); }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold disabled:opacity-40 ${s.danger ? 'text-error hover:bg-error-container' : 'text-on-surface hover:bg-surface-container'}`}>
                  <span className="material-symbols-outlined text-[18px]">{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
            {primary && (
              <button type="button" disabled={busy} onClick={() => { setError(''); setPending(primary.action); }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">{primary.icon}</span>{primary.label}
              </button>
            )}
          </footer>
        )}
      </section>

      <RescheduleDialog open={rescheduleOpen} bookingId={id} bookingCode={booking.bookingCode}
        checkInDate={booking.checkInDate} checkOutDate={booking.checkOutDate}
        onClose={() => setRescheduleOpen(false)}
        onDone={(msg) => { setRescheduleOpen(false); onRescheduled?.(msg); }} />

      {/* ===== Hộp xác nhận chung ===== */}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setPending(null); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
            <h3 id="confirm-title" className="text-lg font-semibold text-on-surface">{confirmCopy[pending].title}</h3>
            <p className="mt-0.5 text-sm text-on-surface-variant">{booking.bookingCode} · {booking.customerName}</p>
            <div className="mt-4 text-sm text-on-surface">{confirmCopy[pending].body}</div>
            {error && <p role="alert" className="mt-3 rounded bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-40">Quay lại</button>
              <button type="button" disabled={busy} onClick={() => void run()}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60 ${confirmCopy[pending].danger ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}`}>
                {busy && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}{confirmCopy[pending].cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
