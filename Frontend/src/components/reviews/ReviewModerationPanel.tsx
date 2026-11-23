import React, { useEffect, useState } from 'react';
import { Modal } from '../../pages/admin/components/AdminUi';
import { reviewApi, ReviewDto, ReviewHistoryDto, ReviewStatus, AiSuggestionDto, AiScanStatusDto, HotelRatingDto } from '../../services/reviewApi';
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
  // AI duyệt sơ bộ
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, AiSuggestionDto>>({});
  const [aiJob, setAiJob] = useState<AiScanStatusDto | null>(null);
  const [aiApplying, setAiApplying] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [hiding, setHiding] = useState<ReviewDto | null>(null);
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [historyOf, setHistoryOf] = useState<ReviewDto | null>(null);
  const [history, setHistory] = useState<ReviewHistoryDto[]>([]);
  /** Tên khách viết đánh giá và người kiểm duyệt (theo mã người dùng). */
  const [people, setPeople] = useState<Record<number, string>>({});
  const [nameQuery, setNameQuery] = useState('');
  const [rating, setRating] = useState<HotelRatingDto | null>(null);

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

  const loadPeople = async (ids: number[]) => {
    const missing = Array.from(new Set(ids)).filter((id) => id && !(id in people));
    if (!missing.length || !hotelId) return;
    try { const map = await reviewApi.people(hotelId, missing); setPeople((prev) => ({ ...prev, ...map })); } catch { /* giữ mã số */ }
  };
  useEffect(() => { void loadPeople(items.map((r) => r.customerId)); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Điểm trung bình & phân bố sao (chỉ tính đánh giá đang hiển thị công khai).
  useEffect(() => {
    if (!hotelId) { setRating(null); return; }
    let alive = true;
    reviewApi.hotelRating(hotelId).then((r) => { if (alive) setRating(r); }).catch(() => { if (alive) setRating(null); });
    return () => { alive = false; };
  }, [hotelId, revision]);

  // Đề xuất AI chưa xử lý của khách sạn đang chọn.
  useEffect(() => {
    if (!hotelId) { setAiSuggestions({}); return; }
    let alive = true;
    reviewApi.aiSuggestions(hotelId)
      .then((list) => { if (alive) setAiSuggestions(Object.fromEntries(list.map((s) => [s.reviewId, s]))); })
      .catch(() => { if (alive) setAiSuggestions({}); });
    return () => { alive = false; };
  }, [hotelId, revision]);

  // Theo dõi tiến độ tác vụ AI quét (2 giây/lần).
  useEffect(() => {
    if (!aiJob || aiJob.state !== 'running') return;
    const timer = window.setInterval(async () => {
      try {
        const next = await reviewApi.aiScanStatus(aiJob.hotelId, aiJob.jobId);
        setAiJob(next);
        if (next.state !== 'running') { setRevision((v) => v + 1); onToast?.(next.message || `AI đã quét ${next.processed} đánh giá.`); }
      } catch { /* thử lại ở nhịp sau */ }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [aiJob, onToast]);

  const startAiScan = async () => {
    setError('');
    try {
      const job = await reviewApi.aiScan(hotelId);
      setAiJob(job);
      if (job.state !== 'running') { if (job.state === 'failed') setError(job.message || 'Không quét được.'); else onToast?.(job.message || 'Không có đánh giá mới cần quét.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Không bắt đầu được AI quét.'); }
  };

  const applyAi = async () => {
    setAiApplying(true); setError('');
    try {
      const r = await reviewApi.aiApply(hotelId);
      onToast?.(`Đã áp dụng đề xuất AI: ${r.shown} hiển thị, ${r.hidden} ẩn, ${r.skipped} để người duyệt.`);
      setRevision((v) => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không áp dụng được đề xuất.'); }
    finally { setAiApplying(false); }
  };

  const aiRunning = aiJob?.state === 'running';
  const confidentCount = Object.values(aiSuggestions).filter((s) => s.decision !== 'review' && s.confidence >= 0.85).length;

  const show = async (review: ReviewDto) => {
    setBusyId(review.reviewId); setError('');
    try { await reviewApi.moderate(hotelId, review.reviewId, 'Visible'); onToast?.('Đã hiển thị đánh giá.'); setRevision((v) => v + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được đánh giá.'); }
    finally { setBusyId(null); }
  };

  /** Áp dụng riêng một đề xuất AI (hiển thị ngay, hoặc ẩn với lý do AI đưa ra). */
  const applyOne = async (review: ReviewDto, ai: AiSuggestionDto) => {
    if (ai.decision === 'show') { await show(review); return; }
    if (ai.decision === 'hide') {
      setBusyId(review.reviewId); setError('');
      try { await reviewApi.moderate(hotelId, review.reviewId, 'Hidden', ai.reason || 'Ẩn theo đề xuất AI'); onToast?.('Đã ẩn đánh giá theo đề xuất AI.'); setRevision((v) => v + 1); }
      catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được đánh giá.'); }
      finally { setBusyId(null); }
    }
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
    try { const list = await reviewApi.history(hotelId, review.reviewId); setHistory(list); void loadPeople(list.map((h) => h.actorId)); }
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
        <label className="relative min-w-[180px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">person_search</span>
          <input type="search" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="Tên khách trên trang này…" aria-label="Lọc theo tên khách"
            className="h-9 w-full rounded-full bg-surface-container-low pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <span className="ml-auto text-sm text-on-surface-variant"><strong className="text-on-surface">{total}</strong> đánh giá</span>
        <button type="button" disabled={aiRunning || !hotelId} onClick={() => void startAiScan()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-outline-variant px-4 text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-50">
          <span className={`material-symbols-outlined text-[18px] text-primary ${aiRunning ? 'animate-spin' : ''}`}>{aiRunning ? 'progress_activity' : 'auto_awesome'}</span>
          {aiRunning ? `AI đang quét ${aiJob?.processed}/${aiJob?.total}` : 'AI quét chờ duyệt'}
        </button>
        {confidentCount > 0 && (
          <button type="button" disabled={aiApplying || aiRunning} onClick={() => void applyAi()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
            <span className="material-symbols-outlined text-[18px]">done_all</span>Áp dụng {confidentCount} đề xuất chắc chắn
          </button>
        )}
        <button type="button" disabled={loading} onClick={() => setRevision((v) => v + 1)} title="Làm mới" aria-label="Làm mới"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-50">
          <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {rating && (
        <div className="mb-5 flex flex-wrap items-center gap-6 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div className="text-center">
            <p className="text-4xl font-bold text-on-surface">{rating.averageRating != null ? rating.averageRating.toFixed(1) : '—'}<span className="text-base font-medium text-outline">/5</span></p>
            <p className="mt-1 text-xs text-on-surface-variant">{rating.totalReviews} đánh giá đang hiển thị</p>
          </div>
          <div className="min-w-[220px] flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = rating.distribution.find((b) => b.rating === star)?.count ?? 0;
              const pct = rating.totalReviews ? Math.round((count / rating.totalReviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="flex w-8 items-center gap-0.5 text-on-surface-variant">{star}<span className="material-symbols-outlined text-[13px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span></span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></span>
                  <span className="w-10 text-right tabular-nums text-on-surface-variant">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}

      {loading && !items.length ? <p role="status" className="p-10 text-center text-sm text-on-surface-variant">Đang tải đánh giá…</p>
        : !items.length ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-outline-variant">reviews</span>
            <p className="mt-2 font-medium text-on-surface">Không có đánh giá phù hợp</p>
            <p className="mt-1 text-xs text-on-surface-variant">Thử chọn bộ lọc khác.</p>
          </div>
        )
        : <div className="space-y-3">{items.filter((r) => !nameQuery.trim() || (people[r.customerId] ?? '').toLowerCase().includes(nameQuery.trim().toLowerCase())).map((review) => {
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
                  <p className="text-xs text-on-surface-variant"><b className="text-sm font-semibold text-on-surface">{people[review.customerId] ?? `Khách #${review.customerId}`}</b> · Đơn #{review.bookingId} · {formatDateVi(review.createdAt)}{review.updatedAt ? ` · đã sửa ${formatDateVi(review.updatedAt)}` : ''}</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[review.status]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />{STATUS_LABEL[review.status]}
                  </span>
                </div>
                {(() => {
                  const ai = aiSuggestions[review.reviewId];
                  if (!ai || review.status !== 'Hidden') return null;
                  const tone = ai.decision === 'show' ? 'bg-emerald-50 text-emerald-800' : ai.decision === 'hide' ? 'bg-error-container/60 text-on-error-container' : 'bg-amber-50 text-amber-900';
                  const label = ai.decision === 'show' ? 'Nên hiển thị' : ai.decision === 'hide' ? 'Nên ẩn' : 'Cần người xem';
                  return (
                    <p className={`mt-2 flex items-start gap-1.5 rounded-2xl px-3 py-2 text-xs ${tone}`}>
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      <span className="flex-1"><b>AI: {label}</b> ({Math.round(ai.confidence * 100)}%){ai.reason ? ` · ${ai.reason}` : ''}</span>
                      {ai.decision !== 'review' && (
                        <button type="button" disabled={busyId === review.reviewId} onClick={() => void applyOne(review, ai)}
                          className="shrink-0 rounded-full bg-surface-container-lowest px-3 py-1 font-semibold text-on-surface shadow-sm hover:opacity-90 disabled:opacity-50">
                          Áp dụng
                        </button>
                      )}
                    </p>
                  );
                })()}
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
                    <button type="button" disabled={busy} onClick={() => { setHiding(review); setReason(aiSuggestions[review.reviewId]?.decision === 'hide' ? aiSuggestions[review.reviewId].reason : ''); setModalError(''); }} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-4 py-1.5 text-sm font-semibold text-error hover:bg-error-container/40 disabled:opacity-50">
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
              <p className="text-xs text-outline">{formatDateVi(h.createdAt)} · {h.action === 'Moderation' ? 'Kiểm duyệt' : h.action === 'AuthorEdit' ? 'Khách sửa đánh giá' : h.action === 'AuthorDelete' ? 'Khách xóa đánh giá' : h.action === 'AiModeration' ? 'AI đề xuất' : h.action} · bởi <b className="text-on-surface-variant">{h.action === 'AiModeration' ? 'AI' : people[h.actorId] ?? `#${h.actorId}`}</b></p>
              {h.reason && <p className="mt-1">{h.reason}</p>}
            </li>
          ))}</ol>}
      </Modal>
    </>
  );
};
export default ReviewModerationPanel;
