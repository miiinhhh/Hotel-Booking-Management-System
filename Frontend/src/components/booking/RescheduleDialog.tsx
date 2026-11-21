import React, { useEffect, useState } from 'react';
import { previewReschedule, rescheduleBooking, ReschedulePreview } from '../../services/bookingApi';

interface RescheduleDialogProps {
  open: boolean;
  bookingId: number;
  bookingCode: string;
  checkInDate: string;   // yyyy-MM-dd
  checkOutDate: string;  // yyyy-MM-dd
  onClose: () => void;
  /** Gọi sau khi đổi lịch thành công. */
  onDone: (message: string) => void;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const viDate = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
const nights = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => fmt(new Date());
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d); };

/**
 * Đổi ngày lưu trú: chọn ngày mới → server tính lại giá (xem trước) → xác nhận.
 * Số tiền đã trả giữ nguyên; chênh lệch cộng/trừ vào phần còn lại thu khi nhận phòng.
 */
export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({ open, bookingId, bookingCode, checkInDate, checkOutDate, onClose, onDone }) => {
  const start = checkInDate.slice(0, 10);
  const end = checkOutDate.slice(0, 10);
  const [checkIn, setCheckIn] = useState(start);
  const [checkOut, setCheckOut] = useState(end);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<ReschedulePreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCheckIn(start); setCheckOut(end); setReason('');
    setPreview(null); setPreviewError(''); setSaveError('');
  }, [open, start, end]);

  const unchanged = checkIn === start && checkOut === end;
  const datesValid = Boolean(checkIn && checkOut) && checkOut > checkIn && checkIn >= todayIso();

  // Xem trước giá mỗi khi đổi ngày (trễ 400ms để tránh gọi liên tục).
  useEffect(() => {
    if (!open || unchanged || !datesValid) { setPreview(null); setPreviewError(''); setLoadingPreview(false); return; }
    let alive = true;
    setLoadingPreview(true); setPreviewError('');
    const t = setTimeout(async () => {
      try {
        const res = await previewReschedule(bookingId, { newCheckInDate: checkIn, newCheckOutDate: checkOut });
        if (!alive) return;
        if (res.success && res.data) setPreview(res.data);
        else { setPreview(null); setPreviewError(res.message || 'Không tính được giá cho ngày mới.'); }
      } catch (e) {
        if (alive) { setPreview(null); setPreviewError(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ.'); }
      } finally {
        if (alive) setLoadingPreview(false);
      }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [open, bookingId, checkIn, checkOut, unchanged, datesValid]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const canSubmit = Boolean(preview?.roomsAvailable) && !loadingPreview && !saving;
  const diff = preview ? preview.newTotalAmount - preview.oldTotalAmount : 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true); setSaveError('');
    try {
      const res = await rescheduleBooking(bookingId, { newCheckInDate: checkIn, newCheckOutDate: checkOut, reason: reason.trim() || undefined });
      if (!res.success) throw new Error(res.message || 'Không đổi được lịch.');
      onDone(`Đã đổi lịch đơn ${bookingCode} sang ${viDate(checkIn)} – ${viDate(checkOut)}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'mt-1 h-11 w-full rounded-full bg-surface-container-low px-4 text-sm font-normal text-on-surface outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-inverse-surface/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => { if (!saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-4">
          <div>
            <h2 id="reschedule-title" className="text-lg font-semibold text-on-surface">Đổi ngày lưu trú</h2>
            <p className="text-sm text-on-surface-variant">Đơn {bookingCode} · hiện tại {viDate(start)} – {viDate(end)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-on-surface-variant">Nhận phòng
              <input type="date" value={checkIn} min={todayIso()} className={input}
                onChange={(e) => { const v = e.target.value; setCheckIn(v); if (v && checkOut <= v) setCheckOut(addDays(v, Math.max(1, nights(start, end)))); }} />
            </label>
            <label className="text-xs font-semibold text-on-surface-variant">Trả phòng
              <input type="date" value={checkOut} min={checkIn ? addDays(checkIn, 1) : todayIso()} onChange={(e) => setCheckOut(e.target.value)} className={input} />
            </label>
          </div>

          {unchanged ? (
            <p className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">Chọn ngày mới để xem giá và phòng trống.</p>
          ) : !datesValid ? (
            <p className="rounded-2xl bg-error-container/50 p-4 text-sm text-on-error-container">Ngày nhận phòng phải từ hôm nay và ngày trả phòng phải sau ngày nhận phòng.</p>
          ) : loadingPreview ? (
            <p role="status" className="flex items-center gap-2 rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Đang kiểm tra phòng trống và tính giá…
            </p>
          ) : previewError ? (
            <p role="alert" className="rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{previewError}</p>
          ) : preview && (
            <div className="space-y-3">
              {!preview.roomsAvailable && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">
                  <span className="material-symbols-outlined text-[18px]">event_busy</span>Phòng đã có khách hoặc bị khóa trong khoảng ngày này. Vui lòng chọn ngày khác.
                </p>
              )}
              <dl className="space-y-2 rounded-2xl border border-outline-variant/40 p-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Lịch mới</dt><dd className="text-right font-semibold text-on-surface">{viDate(checkIn)} – {viDate(checkOut)} · {nights(checkIn, checkOut)} đêm</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Tổng tiền cũ</dt><dd className="tabular-nums text-on-surface-variant line-through">{vnd(preview.oldTotalAmount)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Tổng tiền mới</dt>
                  <dd className="tabular-nums font-semibold text-on-surface">{vnd(preview.newTotalAmount)}
                    {diff !== 0 && <span className={`ml-1.5 text-xs ${diff > 0 ? 'text-error' : 'text-emerald-700'}`}>({diff > 0 ? '+' : '−'}{vnd(Math.abs(diff))})</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Đã thanh toán</dt><dd className="tabular-nums text-emerald-700">{vnd(preview.paidAmount)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-outline-variant/40 pt-2"><dt className="font-semibold text-on-surface">Còn thanh toán khi nhận phòng</dt><dd className="tabular-nums font-bold text-primary">{vnd(preview.newRemainingAmount)}</dd></div>
              </dl>
              {preview.overpaidAmount > 0 && (
                <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Số đã trả nhiều hơn tổng tiền mới <b>{vnd(preview.overpaidAmount)}</b>. Khoản này được khách sạn hoàn lại khi làm thủ tục.</p>
              )}
            </div>
          )}

          <label className="block text-xs font-semibold text-on-surface-variant">Lý do (không bắt buộc)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Ví dụ: thay đổi lịch bay"
              className="mt-1 w-full rounded-2xl bg-surface-container-low p-3 text-sm font-normal text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
          </label>

          {saveError && <p role="alert" className="rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{saveError}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-outline-variant/40 px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-full px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">Đóng</button>
          <button type="button" onClick={() => void submit()} disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-40">
            <span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'event_repeat'}</span>
            {saving ? 'Đang đổi lịch…' : 'Xác nhận đổi lịch'}
          </button>
        </footer>
      </div>
    </div>
  );
};
export default RescheduleDialog;
