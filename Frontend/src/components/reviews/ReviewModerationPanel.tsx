import React, { useEffect, useState } from 'react';
import { Modal } from '../../pages/admin/components/AdminUi';
import { reviewApi, ReviewDto, ReviewHistoryDto, ReviewStatus } from '../../services/reviewApi';
import { CRITERIA_LABELS, CriteriaKey, parseReviewComment } from '../../pages/booking-history/reviewFormat';
import { formatDateVi } from '../../utils/formatters';

export interface ModerationHotel { hotelId: number; hotelName: string }

interface Props {
  /** Khách sạn được phép kiểm duyệt (Admin: tất cả; Staff: khách sạn được phân công). */
  hotels: ModerationHotel[];
  onToast?: (message: string) => void;
}

const STATUS_LABEL: Record<ReviewStatus, string> = { Visible: 'Đang hiển thị', Hidden: 'Đang ẩn', Deleted: 'Khách đã xóa' };
const STATUS_CLASS: Record<ReviewStatus, string> = {
  Visible: 'bg-emerald-50 text-emerald-700',
  Hidden: 'bg-amber-50 text-amber-800',
  Deleted: 'bg-surface-container-high text-outline',
};
const FILTERS: { id: ReviewStatus | ''; label: string }[] = [
  { id: 'Hidden', label: 'Đang ẩn' },
  { id: 'Visible', label: 'Đang hiển thị' },
  { id: '', label: 'Tất cả' },
];
const PAGE_SIZE = 10;

/**
 * Kiểm duyệt đánh giá: chỉ HIỂN THỊ hoặc ẨN (ẩn bắt buộc có lý do). Không có thao tác xóa —
 * Backend cũng từ chối trạng thái Deleted từ kiểm duyệt.
 */
export const ReviewModerationPanel: React.FC<Props> = ({ hotels, onToast }) => {
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.hotelId ?? 0);
  const [filter, setFilter] = useState<ReviewStatus | ''>('Hidden');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ReviewDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [hiding, setHiding] = useState<ReviewDto | null>(null);
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [historyOf, setHistoryOf] = useState<ReviewDto | null>(null);
  const [history, setHistory] = useState<ReviewHistoryDto[]>([]);

  useEffect(() => {
    if (!hotels.some((h) => h.hotelId === hotelId)) setHotelId(hotels[0]?.hotelId ?? 0);
  }, [hotels, hotelId]);

  useEffect(() => {
    if (!hotelId) { setItems([]); setTotal(0); return; }
    let alive = true;
    setLoading(true); setError('');
    reviewApi.moderationList(hotelId, filter || undefined, page, PAGE_SIZE)
      .then((res) => { if (alive) { setItems(res.items); setTotal(res.total); } })
      .catch((e) => { if (alive) { setItems([]); setError(e instanceof Error ? e.message : 'Không tải được đánh giá.'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [hotelId, filter, page, revision]);

  const show = async (review: ReviewDto) => {
    setBusyId(review.reviewId); setError('');
    try { await reviewApi.moderate(hotelId, review.reviewId, 'Visible'); onToast?.('Đã hiển thị đánh giá.'); setRevision((v) => v + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được đánh giá.'); }
    finally { setBusyId(null); }
  };

  const confirmHide = async () => {
    if (!hiding) return;
    if (!reason.trim()) { setModalError('Vui lòng nhập lý do ẩn đánh giá.'); return; }
    setBusyId(hiding.reviewId); setModalError('');
    try { await reviewApi.moderate(hotelId, hiding.reviewId, 'Hidden', reason); onToast?.('Đã ẩn đánh giá.'); setHiding(null); setRevision((v) => v + 1); }
    catch (e) { setModalError(e instanceof Error ? e.message : 'Không ẩn được đánh giá.'); }
    finally { setBusyId(null); }
  };

  const openHistory = async (review: ReviewDto) => {
    setHistoryOf(review); setHistory([]);
    try { setHistory(await reviewApi.history(hotelId, review.reviewId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được lịch sử.'); setHistoryOf(null); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!hotels.length) {
    return <p className="rounded-2xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">Chưa có khách sạn nào trong phạm vi bạn được kiểm duyệt.</p>;
  }

  return (
    <>
      {/* Thanh công cụ */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
        {hotels.length > 1 ? (
          <label className="flex items-center gap-2 rounded-full bg-surface-container-low pl-4 pr-2 text-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
            <select aria-label="Chọn khách sạn" value={hotelId} onChange={(e) => { setHotelId(Number(e.target.value)); setPage(1); }} className="bg-transparent py-2.5 pr-2 font-medium outline-none">
              {hotels.map((h) => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
            </select>
          </label>
        ) : (
          <span className="flex items-center gap-2 px-2 text-sm font-semibold"><span className="material-symbols-outlined text-[18px] text-primary">apartment</span>{hotels[0].hotelName}</span>
        )}
        <div className="inline-flex rounded-full bg-surface-container-low p-1">
          {FILTERS.map((f) => (
            <button key={f.id || 'all'} type="button" onClick={() => { setFilter(f.id); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === f.id ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-on-surface-variant"><strong className="text-on-surface">{total}</strong> đánh giá</span>
        <button type="button" disabled={loading} onClick={() => setRevision((v) => v + 1)} title="Làm mới" aria-label="Làm mới"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-50">
          <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}

      {loading && !items.length ? <p role="status" className="p-10 text-center text-sm text-on-surface-variant">Đang tải đánh giá…</p>
        : !items.length ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-outline-variant">reviews</span>
            <p className="mt-2 font-medium text-on-surface">Không có đánh giá phù hợp</p>
            <p className="mt-1 text-xs text-on-surface-variant">Thử chọn bộ lọc khác.</p>
          </div>
        )
        : <div className="space-y-3">{items.map((review) => {
          const parsed = parseReviewComment(review.comment);
          const busy = busyId === review.reviewId;
          return (
            <article key={review.reviewId} className="flex gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
              {/* Điểm */}
              <div className="flex w-16 shrink-0 flex-col items-center">
                <span className="text-2xl font-bold text-primary">{review.rating}<span className="text-sm font-medium text-outline">/5</span></span>
                <span className="mt-0.5 flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: `'FILL' ${i < review.rating ? 1 : 0}` }}>star</span>
                  ))}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-on-surface-variant">Đơn #{review.bookingId} · {formatDateVi(review.createdAt)}{review.updatedAt ? ` · đã sửa ${formatDateVi(review.updatedAt)}` : ''}</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[review.status]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />{STATUS_LABEL[review.status]}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-on-surface">{parsed.comment || <span className="italic text-outline">Khách không để lại bình luận.</span>}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Object.keys(CRITERIA_LABELS) as CriteriaKey[]).map((k) => (
                    <span key={k} className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] text-on-surface-variant">{CRITERIA_LABELS[k]} <strong className="text-on-surface">{parsed.criteria[k]}</strong></span>
                  ))}
                  {parsed.tags.map((t) => <span key={t} className="rounded-full border border-outline-variant/50 px-2.5 py-1 text-[11px] text-on-surface-variant">{t}</span>)}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-outline-variant/30 pt-3">
                  <button type="button" onClick={() => void openHistory(review)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container">
                    <span className="material-symbols-outlined text-[18px]">history</span>Lịch sử
                  </button>
                  {review.status === 'Hidden' && (
                    <button type="button" disabled={busy} onClick={() => void show(review)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary disabled:opacity-50">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>{busy ? 'Đang lưu…' : 'Hiển thị'}
                    </button>
                  )}
                  {review.status === 'Visible' && (
                    <button type="button" disabled={busy} onClick={() => { setHiding(review); setReason(''); setModalError(''); }} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-4 py-1.5 text-sm font-semibold text-error hover:bg-error-container/40 disabled:opacity-50">
                      <span className="material-symbols-outlined text-[18px]">visibility_off</span>Ẩn
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}</div>}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label="Trang trước" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-40"><span className="material-symbols-outlined">chevron_left</span></button>
          <span className="text-on-surface-variant">Trang <strong className="text-on-surface">{page}</strong> / {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} aria-label="Trang sau" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-40"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
      )}

      <Modal title="Ẩn đánh giá" open={hiding !== null} onClose={() => { if (busyId === null) setHiding(null); }}
        footer={<><button type="button" disabled={busyId !== null} onClick={() => setHiding(null)} className="rounded-full bg-surface-container px-5 py-2">Hủy</button><button type="button" disabled={busyId !== null} onClick={() => void confirmHide()} className="rounded-full bg-error-container px-5 py-2 font-semibold text-on-error-container disabled:opacity-50">{busyId !== null ? 'Đang lưu…' : 'Ẩn đánh giá'}</button></>}>
        <p className="mb-3 text-sm text-on-surface-variant">Đánh giá sẽ không còn hiển thị công khai và không tính vào điểm khách sạn. Nội dung vẫn được giữ lại, có thể hiển thị lại sau.</p>
        {modalError && <p role="alert" className="mb-3 rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{modalError}</p>}
        <label className="block text-sm font-semibold">Lý do ẩn (bắt buộc)
          <textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Ngôn từ không phù hợp, quảng cáo, chứa thông tin cá nhân…" className="mt-1 w-full rounded-2xl bg-surface-container-low p-3 font-normal" />
        </label>
      </Modal>

      <Modal title={`Lịch sử kiểm duyệt #${historyOf?.reviewId ?? ''}`} open={historyOf !== null} onClose={() => setHistoryOf(null)}>
        {!history.length ? <p className="text-sm text-on-surface-variant">Chưa có thay đổi trạng thái nào.</p>
          : <ol className="space-y-3">{history.map((h) => (
            <li key={h.historyId} className="rounded-2xl bg-surface-container-low p-3 text-sm">
              <p><strong>{STATUS_LABEL[h.oldStatus]}</strong> → <strong>{STATUS_LABEL[h.newStatus]}</strong></p>
              <p className="text-xs text-outline">{formatDateVi(h.createdAt)} · {h.action === 'Moderation' ? 'Kiểm duyệt' : h.action === 'AuthorEdit' ? 'Khách sửa đánh giá' : h.action === 'AuthorDelete' ? 'Khách xóa đánh giá' : h.action}</p>
              {h.reason && <p className="mt-1">{h.reason}</p>}
            </li>
          ))}</ol>}
      </Modal>
    </>
  );
};
export default ReviewModerationPanel;
