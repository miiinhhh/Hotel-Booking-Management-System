import React, { useEffect, useMemo, useState } from 'react';
import { PageHeading } from '../components/AdminUi';
import { BusinessReport, day, discoveryApi, discoveryRequest } from '../../../services/discoveryApi';
import { BusinessCharts } from '../components/BusinessCharts';

/* ============================================================================
 * Tiện ích
 * ========================================================================== */

const money = (value: number) => value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const compact = (value: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) + ' ₫';
const pct = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso: string, n: number) => { const d = parse(iso); d.setDate(d.getDate() + n); return toIso(d); };
const diffDays = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
const viDate = (iso: string) => parse(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Khoảng ngày [from, to) — "to" là ngày kết thúc KHÔNG tính, khớp tham số của API báo cáo. */
type Range = { from: string; to: string };
type Preset = '7d' | '30d' | 'this-month' | 'last-month' | 'custom';

const PRESETS: { id: Preset; label: string; range?: () => Range }[] = [
  { id: '7d', label: '7 ngày', range: () => ({ from: day(-6), to: day(1) }) },
  { id: '30d', label: '30 ngày', range: () => ({ from: day(-29), to: day(1) }) },
  { id: 'this-month', label: 'Tháng này', range: () => { const n = new Date(); return { from: toIso(new Date(n.getFullYear(), n.getMonth(), 1)), to: day(1) }; } },
  { id: 'last-month', label: 'Tháng trước', range: () => { const n = new Date(); return { from: toIso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: toIso(new Date(n.getFullYear(), n.getMonth(), 1)) }; } },
  { id: 'custom', label: 'Tùy chọn' },
];

/** Kỳ trước có cùng độ dài, nằm ngay trước kỳ đang xem — dùng để so sánh. */
const previousRange = (r: Range): Range => { const len = diffDays(r.from, r.to); return { from: addDays(r.from, -len), to: r.from }; };

/** Chỉ số suy ra từ báo cáo. ADR/RevPAR tính trên thu tiền ròng nên là giá trị ước tính. */
const metrics = (r: BusinessReport) => ({
  revenue: r.revenue,
  occupancy: r.occupancyRate,
  adr: r.occupiedRoomNights ? r.revenue / r.occupiedRoomNights : 0,
  revpar: r.availableRoomNights ? r.revenue / r.availableRoomNights : 0,
  bookings: r.bookingCount,
  cancellation: r.cancellationRate,
});
type MetricKey = keyof ReturnType<typeof metrics>;

const KPI: { key: MetricKey; label: string; icon: string; hint: string; format: (v: number) => string; lowerIsBetter?: boolean; pointDelta?: boolean }[] = [
  { key: 'revenue', label: 'Doanh thu ròng', icon: 'payments', hint: 'Tiền thanh toán thành công trừ tiền đã hoàn, theo ngày giao dịch.', format: compact },
  { key: 'occupancy', label: 'Công suất phòng', icon: 'hotel', hint: 'Đêm phòng đã đặt / đêm phòng có thể bán.', format: pct, pointDelta: true },
  { key: 'adr', label: 'Giá bình quân (ADR)', icon: 'sell', hint: 'Ước tính: doanh thu ròng / đêm phòng đã đặt.', format: compact },
  { key: 'revpar', label: 'RevPAR', icon: 'trending_up', hint: 'Ước tính: doanh thu ròng / đêm phòng có thể bán.', format: compact },
  { key: 'bookings', label: 'Booking mới', icon: 'event_available', hint: 'Số booking được tạo trong kỳ.', format: v => v.toLocaleString('vi-VN') },
  { key: 'cancellation', label: 'Tỷ lệ hủy', icon: 'event_busy', hint: 'Booking bị hủy / booking tạo mới.', format: pct, lowerIsBetter: true, pointDelta: true },
];

/* ============================================================================
 * Trang
 * ========================================================================== */

export const AdminOverview: React.FC = () => {
  const [preset, setPreset] = useState<Preset>('7d');
  const [range, setRange] = useState<Range>(() => PRESETS[0].range!());
  const [hotelId, setHotelId] = useState('');
  const [hotels, setHotels] = useState<{ hotelId: number; hotelName: string }[]>([]);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [previous, setPrevious] = useState<BusinessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [policy, setPolicy] = useState('');
  const [policyNotice, setPolicyNotice] = useState('');

  const filters = useMemo(() => ({ from: range.from, to: range.to, hotelId }), [range, hotelId]);
  const rangeValid = range.from && range.to && range.to > range.from;

  // Danh sách khách sạn (tải hết các trang)
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const all: { hotelId: number; hotelName: string }[] = []; let page = 1;
      while (!controller.signal.aborted) {
        const data = await discoveryRequest<{ items: typeof all; totalCount: number }>(`/api/hotels?pageNumber=${page++}&pageSize=100`, { signal: controller.signal });
        all.push(...data.items);
        if (all.length >= data.totalCount || !data.items.length) break;
      }
      if (!controller.signal.aborted) setHotels(all);
    })().catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);

  // Báo cáo kỳ hiện tại + kỳ trước (để so sánh)
  useEffect(() => {
    if (!rangeValid) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    const prev = previousRange(range);
    Promise.all([
      discoveryApi.report(filters, controller.signal),
      discoveryApi.report({ ...filters, from: prev.from, to: prev.to }, controller.signal).catch(() => null),
    ]).then(([cur, before]) => {
      if (controller.signal.aborted) return;
      setReport(cur); setPrevious(before);
    }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setReport(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, retry]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    const found = PRESETS.find(x => x.id === p);
    if (found?.range) setRange(found.range());
  };

  const exportData = async () => {
    setExporting(true);
    try { await discoveryApi.exportReport(filters); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không xuất được báo cáo.'); }
    finally { setExporting(false); }
  };

  const cur = report ? metrics(report) : null;
  const prev = previous ? metrics(previous) : null;
  const prevRange = previousRange(range);
  const days = diffDays(range.from, range.to);
  const hotelName = hotels.find(h => String(h.hotelId) === hotelId)?.hotelName;

  return <>
    <PageHeading title="Tổng quan kinh doanh" description="Doanh thu, công suất và đặt phòng theo khoảng thời gian." actions={<>
      <button type="button" title="Tải lại" aria-label="Tải lại" onClick={() => setRetry(retry + 1)} disabled={loading}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-40">
        <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
      </button>
      <button type="button" disabled={!report || loading || exporting} onClick={() => void exportData()}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40">
        <span className="material-symbols-outlined text-[18px]">download</span>{exporting ? 'Đang xuất…' : 'Xuất CSV'}
      </button>
    </>} />

    {/* ===== Thanh bộ lọc ===== */}
    <section className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
      <label className="flex items-center gap-2 rounded-full bg-surface-container-low py-1 pl-4 pr-1 text-sm">
        <span className="material-symbols-outlined text-[18px] text-primary">hotel</span>
        <select aria-label="Khách sạn" value={hotelId} onChange={e => { setHotelId(e.target.value); setPolicy(''); setPolicyNotice(''); }}
          className="max-w-[220px] rounded-full bg-transparent py-1.5 pr-2 font-semibold outline-none">
          <option value="">Toàn hệ thống</option>
          {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-1 rounded-full bg-surface-container-low p-1" role="group" aria-label="Khoảng thời gian">
        {PRESETS.map(p => (
          <button key={p.id} type="button" onClick={() => choosePreset(p.id)} aria-pressed={preset === p.id}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${preset === p.id ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" aria-label="Từ ngày" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })}
            className="h-9 rounded-full border border-outline-variant bg-surface-container-lowest px-3 outline-none focus:border-primary" />
          <span className="text-on-surface-variant">→</span>
          <input type="date" aria-label="Đến ngày" min={range.from} value={addDays(range.to, -1)} onChange={e => setRange({ ...range, to: addDays(e.target.value, 1) })}
            className="h-9 rounded-full border border-outline-variant bg-surface-container-lowest px-3 outline-none focus:border-primary" />
          {!rangeValid && <span className="text-error">Khoảng ngày không hợp lệ</span>}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">{viDate(range.from)} – {viDate(addDays(range.to, -1))} · {days} ngày</p>
      )}
    </section>

    {error && <p role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-error-container p-4 text-on-error-container">{error}<button onClick={() => setError('')} className="font-semibold">Đóng</button></p>}

    {/* ===== Chỉ số chính ===== */}
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPI.map(k => {
        const value = cur?.[k.key];
        const before = prev?.[k.key];
        let delta: React.ReactNode = null;
        if (value != null && before != null) {
          const change = k.pointDelta ? value - before : before ? ((value - before) / Math.abs(before)) * 100 : null;
          if (change != null && Number.isFinite(change)) {
            const flat = Math.abs(change) < 0.05;
            const good = flat ? null : (change > 0) !== Boolean(k.lowerIsBetter);
            delta = (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${flat ? 'text-on-surface-variant' : good ? 'text-emerald-700' : 'text-error'}`}>
                <span className="material-symbols-outlined text-[14px]">{flat ? 'remove' : change > 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                {flat ? 'Không đổi' : `${Math.abs(change).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${k.pointDelta ? ' điểm' : '%'}`}
              </span>
            );
          }
        }
        return (
          <article key={k.key} title={k.hint} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-primary">{k.icon}</span>{k.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface">{loading || value == null ? '–' : k.format(value)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-outline">
              {loading ? ' ' : delta ? <>{delta} so với kỳ trước</> : 'Chưa có dữ liệu kỳ trước'}
            </p>
          </article>
        );
      })}
    </section>
    <details className="mb-6 mt-2 px-1 text-xs text-on-surface-variant">
      <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-on-surface">
        <span className="material-symbols-outlined text-[16px]">info</span>Cách tính các chỉ số
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        {KPI.map(k => <li key={k.key}><b>{k.label}:</b> {k.hint}</li>)}
        <li>So sánh với kỳ trước cùng độ dài: {viDate(prevRange.from)} – {viDate(addDays(prevRange.to, -1))}.</li>
        <li>Công suất dựa trên nguồn phòng đang hoạt động hiện tại, không phải lịch sử nguồn cung.</li>
      </ul>
    </details>

    {/* ===== Biểu đồ ===== */}
    {loading && !report && <p role="status" className="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant shadow-sm">Đang tải báo cáo…</p>}
    {report && <BusinessCharts report={report} />}

    {/* ===== Chi tiết theo ngày (thu gọn mặc định) ===== */}
    {report && (
      <details className="group mt-6 rounded-2xl bg-surface-container-lowest shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span className="font-semibold">Chi tiết theo ngày <span className="font-normal text-on-surface-variant">· {report.days.length} ngày</span></span>
          <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
        </summary>
        <div className="max-h-96 overflow-auto border-t border-outline-variant/40">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-container-low text-xs text-on-surface-variant">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Ngày</th>
                <th className="px-5 py-2.5 text-right font-semibold">Doanh thu ròng</th>
                <th className="px-5 py-2.5 text-right font-semibold">Booking mới</th>
                <th className="px-5 py-2.5 text-right font-semibold">Đêm đã đặt / có thể bán</th>
                <th className="px-5 py-2.5 text-right font-semibold">Công suất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {report.days.map(d => {
                const occ = d.availableRoomNights ? (d.occupiedRoomNights * 100) / d.availableRoomNights : 0;
                return (
                  <tr key={d.date} className="hover:bg-surface-container-low/60">
                    <td className="px-5 py-2.5">{viDate(d.date)}</td>
                    <td className={`px-5 py-2.5 text-right tabular-nums ${d.revenue < 0 ? 'text-error' : ''}`}>{money(d.revenue)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{d.bookings}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-on-surface-variant">{d.occupiedRoomNights} / {d.availableRoomNights}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{pct(occ)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    )}

    {/* ===== Chính sách hủy (chỉ khi chọn một khách sạn) ===== */}
    {hotelId && (
      <details className="group mt-4 rounded-2xl bg-surface-container-lowest shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span className="font-semibold">Chính sách hủy hiển thị{hotelName ? <span className="font-normal text-on-surface-variant"> · {hotelName}</span> : null}</span>
          <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
        </summary>
        <form className="space-y-3 border-t border-outline-variant/40 p-5" onSubmit={async e => {
          e.preventDefault();
          try {
            await discoveryRequest(`/api/hotels/${hotelId}/policy`, { method: 'PUT', body: JSON.stringify({ cancellationPolicy: policy }) });
            setPolicyNotice('Đã lưu chính sách hiển thị của khách sạn.');
          } catch (err) { setPolicyNotice(err instanceof Error ? err.message : 'Không lưu được.'); }
        }}>
          <p className="text-sm text-on-surface-variant">Nội dung hiển thị cho khách ở trang khách sạn; không thay đổi cách tính phí hủy và hoàn tiền.</p>
          <textarea required maxLength={2000} value={policy} onChange={e => setPolicy(e.target.value)} aria-label="Chính sách hủy mới"
            placeholder="Nhập nội dung chính sách mới để thay thế…"
            className="block min-h-28 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 outline-none focus:border-primary" />
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary">Lưu chính sách</button>
            {policyNotice && <p role="status" className="text-sm text-on-surface-variant">{policyNotice}</p>}
          </div>
        </form>
      </details>
    )}
  </>;
};
