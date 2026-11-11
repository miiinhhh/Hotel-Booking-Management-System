import React, { useEffect, useState } from 'react';
import { PageHeading } from '../components/AdminUi';
import { BusinessReport, day, discoveryApi, discoveryRequest } from '../../../services/discoveryApi';
import { BusinessCharts } from '../components/BusinessCharts';
const money = (value: number) => value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
export const AdminOverview: React.FC = () => {
  const [filters, setFilters] = useState({ from: day(-6), to: day(1), hotelId: '' });
  const [hotels, setHotels] = useState<{ hotelId: number; hotelName: string }[]>([]);
  const [report, setReport] = useState<BusinessReport | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [retry, setRetry] = useState(0); const [exporting, setExporting] = useState(false);
  const [policy, setPolicy] = useState(''); const [policyNotice, setPolicyNotice] = useState('');
  useEffect(() => { const controller = new AbortController(); (async () => { const all: { hotelId: number; hotelName: string }[] = []; let page = 1; while (!controller.signal.aborted) { const data = await discoveryRequest<{ items: typeof all; totalCount: number }>(`/api/hotels?pageNumber=${page++}&pageSize=100`, { signal: controller.signal }); all.push(...data.items); if (all.length >= data.totalCount || !data.items.length) break; } if (!controller.signal.aborted) setHotels(all); })().catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); setReport(null);
    discoveryApi.report(filters, controller.signal).then(value => { if (!controller.signal.aborted) setReport(value); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort();
  }, [filters, retry]);
  const exportData = async () => { setExporting(true); try { await discoveryApi.exportReport(filters); } catch (e) { setError(e instanceof Error ? e.message : 'Không xuất được báo cáo.'); } finally { setExporting(false); } };
  return <>
    <PageHeading title="Tổng quan kinh doanh" description="Dữ liệu từ booking, thanh toán và tồn phòng của hệ thống." actions={<><button className="rounded-full bg-surface-container px-4 py-2" onClick={() => setRetry(retry + 1)}>Tải lại</button><button className="rounded-full bg-primary px-4 py-2 text-on-primary disabled:opacity-40" disabled={!report || loading || exporting} onClick={() => void exportData()}>{exporting ? 'Đang xuất…' : 'Xuất CSV'}</button></>} />
    <form className="mb-6 flex flex-wrap gap-4 rounded-xl bg-surface-container-low p-4" onSubmit={e => e.preventDefault()}>
      <label>Từ ngày<input type="date" required value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="mt-1 block rounded-lg border p-2" /></label>
      <label>Đến trước ngày<input type="date" required min={filters.from} value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="mt-1 block rounded-lg border p-2" /></label>
      <label>Khách sạn<select className="mt-1 block rounded-lg border p-2" value={filters.hotelId} onChange={e => { setFilters({ ...filters, hotelId: e.target.value }); setPolicyNotice(''); setPolicy(''); }}><option value="">Toàn hệ thống</option>{hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}</select></label>
    </form>
    {loading && <p role="status">Đang tải báo cáo…</p>}{error && <p role="alert" className="mb-5 rounded-xl bg-error-container p-4">{error}</p>}
    {report && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Thu tiền ròng', money(report.revenue)], ['Công suất đặt phòng', `${report.occupancyRate}%`], ['Booking tạo mới', report.bookingCount], ['Tỷ lệ hủy', `${report.cancellationRate}%`]].map(([label, value]) => <article key={label} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5"><p>{label}</p><strong className="mt-3 block text-3xl">{value}</strong></article>)}</section>
      <p className="my-4 text-sm text-outline">Thu tiền ròng = tiền thanh toán thành công − tiền hoàn thành công theo ngày PaidAt (UTC). Công suất dựa trên đêm phòng đã xác nhận/lưu trú và nguồn phòng đang hoạt động; không phải lịch sử nguồn cung.</p>
      <BusinessCharts report={report} />
      <section className="mt-5 max-h-96 overflow-auto rounded-xl bg-surface-container-lowest"><table className="w-full text-left"><caption className="p-4 text-left text-xl font-semibold">Chi tiết báo cáo</caption><thead><tr>{['Ngày', 'Thu tiền ròng', 'Booking mới', 'Đêm đã đặt', 'Đêm có thể bán'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{report.days.map(d => <tr className="border-t" key={d.date}><td className="p-3">{d.date}</td><td>{money(d.revenue)}</td><td>{d.bookings}</td><td>{d.occupiedRoomNights}</td><td>{d.availableRoomNights}</td></tr>)}</tbody></table></section>
    </>}
    {filters.hotelId && <form className="mt-6 space-y-3 rounded-xl bg-surface-container-lowest p-5" onSubmit={async e => { e.preventDefault(); try { await discoveryRequest(`/api/hotels/${filters.hotelId}/policy`, { method: 'PUT', body: JSON.stringify({ cancellationPolicy: policy }) }); setPolicyNotice('Đã lưu chính sách hiển thị của khách sạn.'); } catch (e) { setPolicyNotice(e instanceof Error ? e.message : 'Không lưu được.'); } }}><h2 className="text-xl font-semibold">Cập nhật chính sách hủy hiển thị</h2><p className="text-sm">Nội dung này cung cấp thông tin cho khách; không thay đổi công thức tính phí/hoàn tiền của module thanh toán.</p><textarea required maxLength={2000} value={policy} onChange={e => setPolicy(e.target.value)} className="block w-full rounded-lg border p-3" aria-label="Chính sách hủy mới" placeholder="Nhập nội dung chính sách mới để thay thế…" /><button className="rounded-full bg-primary px-5 py-2 text-on-primary">Lưu chính sách</button>{policyNotice && <p role="status">{policyNotice}</p>}</form>}
  </>;
};
