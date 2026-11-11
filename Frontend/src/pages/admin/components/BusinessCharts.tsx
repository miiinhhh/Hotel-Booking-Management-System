import React, { useMemo, useState } from 'react';
import { BusinessReport } from '../../../services/discoveryApi';

type Grouping = 'day' | 'week' | 'month';
type Day = BusinessReport['days'][number];
type Point = Day & { key: string; label: string; occupancy: number };

const money = (value: number) => value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
const compactMoney = (value: number) => new Intl.NumberFormat('vi-VN', {
  notation: 'compact', maximumFractionDigits: 1,
}).format(value);

const parseDate = (value: string) => new Date(`${value}T00:00:00Z`);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const shortDate = (value: string) => parseDate(value).toLocaleDateString('vi-VN', {
  day: '2-digit', month: '2-digit', timeZone: 'UTC',
});

function groupDays(days: Day[], grouping: Grouping): Point[] {
  const groups = new Map<string, Day>();
  for (const day of days) {
    const date = parseDate(day.date);
    let key = day.date;
    if (grouping === 'week') {
      const offset = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - offset);
      key = isoDate(date);
    } else if (grouping === 'month') {
      key = `${day.date.slice(0, 7)}-01`;
    }
    const current = groups.get(key);
    groups.set(key, {
      date: key,
      revenue: (current?.revenue ?? 0) + day.revenue,
      bookings: (current?.bookings ?? 0) + day.bookings,
      occupiedRoomNights: (current?.occupiedRoomNights ?? 0) + day.occupiedRoomNights,
      availableRoomNights: (current?.availableRoomNights ?? 0) + day.availableRoomNights,
    });
  }
  return [...groups.entries()].map(([key, value]) => ({
    ...value,
    key,
    label: grouping === 'month'
      ? parseDate(key).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      : grouping === 'week' ? `Tuần ${shortDate(key)}` : shortDate(key),
    occupancy: value.availableRoomNights
      ? Math.min(100, value.occupiedRoomNights * 100 / value.availableRoomNights) : 0,
  }));
}

const GroupingControl: React.FC<{ value: Grouping; onChange: (value: Grouping) => void }> = ({ value, onChange }) => (
  <div className="inline-flex rounded-full bg-surface-container p-1" aria-label="Nhóm dữ liệu biểu đồ">
    {([['day', 'Ngày'], ['week', 'Tuần'], ['month', 'Tháng']] as const).map(([id, label]) =>
      <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={`rounded-full px-4 py-1.5 text-sm ${value === id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'}`}>{label}</button>)}
  </div>
);

const HoverSummary: React.FC<{ point?: Point }> = ({ point }) => (
  <div className="min-h-16 rounded-lg bg-surface-container-low p-3 text-sm" aria-live="polite">
    {point ? <div className="flex flex-wrap gap-x-5 gap-y-1"><strong>{point.label}</strong><span>Doanh thu: {money(point.revenue)}</span><span>Booking: {point.bookings}</span><span>Công suất: {point.occupancy.toFixed(1)}%</span></div>
      : <span className="text-on-surface-variant">Rê chuột hoặc dùng phím Tab trên điểm dữ liệu để xem chi tiết.</span>}
  </div>
);

const XLabels: React.FC<{ points: Point[]; left: number; top: number; plotWidth: number }> = ({ points, left, top, plotWidth }) => {
  const step = Math.max(1, Math.ceil(points.length / 10));
  return <>{points.map((point, index) => {
    if (index % step !== 0 && index !== points.length - 1) return null;
    const x = left + (index + 0.5) * plotWidth / Math.max(1, points.length);
    return <text key={point.key} x={x} y={top} textAnchor="middle" className="fill-on-surface-variant text-[11px]">{point.label}</text>;
  })}</>;
};

const RevenueChart: React.FC<{ points: Point[] }> = ({ points }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = Math.max(680, points.length * 52 + 90); const height = 310;
  const left = 76; const right = 20; const top = 20; const bottom = 52;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  let minimum = Math.min(0, ...points.map(point => point.revenue));
  let maximum = Math.max(0, ...points.map(point => point.revenue));
  if (minimum === maximum) maximum = minimum + 1;
  const range = maximum - minimum;
  const y = (value: number) => top + (maximum - value) * plotHeight / range;
  const zeroY = y(0); const slot = plotWidth / Math.max(1, points.length);
  const barWidth = Math.min(30, Math.max(10, slot * 0.62));
  return <article className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Doanh thu ròng</h2><p className="text-sm text-on-surface-variant">Thanh toán thành công trừ khoản hoàn thành công.</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-primary-container" />Dương</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-error" />Âm</span></div></div>
    <HoverSummary point={hovered === null ? undefined : points[hovered]} />
    {!points.some(point => point.revenue !== 0) && <p className="mt-3 text-sm text-outline">Chưa có giao dịch thành công trong khoảng này.</p>}
    <div className="mt-3 overflow-x-auto"><svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ cột doanh thu ròng">
      {[0, 1, 2, 3, 4].map(index => { const value = maximum - range * index / 4; const lineY = y(value); return <g key={index}><line x1={left} x2={width - right} y1={lineY} y2={lineY} className="stroke-outline-variant/40" /><text x={left - 10} y={lineY + 4} textAnchor="end" className="fill-on-surface-variant text-[11px]">{compactMoney(value)}</text></g>; })}
      <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} className="stroke-on-surface-variant" />
      {points.map((point, index) => { const x = left + index * slot + (slot - barWidth) / 2; const valueY = y(point.revenue); const rectY = Math.min(zeroY, valueY); const rectHeight = Math.max(1, Math.abs(zeroY - valueY)); return <rect key={point.key} tabIndex={0} role="graphics-symbol" aria-label={`${point.label}: ${money(point.revenue)}`} x={x} y={rectY} width={barWidth} height={rectHeight} rx={4} className={`${point.revenue < 0 ? 'fill-error' : 'fill-primary-container'} cursor-pointer outline-none opacity-90 hover:opacity-100 focus:stroke-on-surface focus:stroke-2`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)}><title>{point.label}: {money(point.revenue)}</title></rect>; })}
      <XLabels points={points} left={left} top={height - 18} plotWidth={plotWidth} />
    </svg></div>
  </article>;
};

const LineChart: React.FC<{ points: Point[]; type: 'bookings' | 'occupancy' }> = ({ points, type }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = Math.max(680, points.length * 52 + 90); const height = 310;
  const left = 58; const right = 20; const top = 24; const bottom = 52;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const maximum = type === 'occupancy' ? 100 : Math.max(1, ...points.map(point => point.bookings));
  const value = (point: Point) => type === 'occupancy' ? point.occupancy : point.bookings;
  const x = (index: number) => left + (index + 0.5) * plotWidth / Math.max(1, points.length);
  const y = (amount: number) => top + (maximum - amount) * plotHeight / maximum;
  const color = type === 'occupancy' ? 'text-secondary' : 'text-primary';
  const title = type === 'occupancy' ? 'Công suất phòng' : 'Booking tạo mới';
  const description = type === 'occupancy' ? 'Tỷ lệ đêm phòng đã sử dụng trên số đêm có thể bán.' : 'Số booking được tạo trong từng kỳ.';
  const line = points.map((point, index) => `${x(index)},${y(value(point))}`).join(' ');
  return <article className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-on-surface-variant">{description}</p></div><span className={`flex items-center gap-2 text-xs ${color}`}><i className="h-1 w-8 rounded bg-current" />{type === 'occupancy' ? '%' : 'Booking'}</span></div>
    <HoverSummary point={hovered === null ? undefined : points[hovered]} />
    <div className="mt-3 overflow-x-auto"><svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Biểu đồ đường ${title.toLowerCase()}`}>
      {[0, 1, 2, 3, 4].map(index => { const tick = maximum - maximum * index / 4; const lineY = y(tick); return <g key={index}><line x1={left} x2={width - right} y1={lineY} y2={lineY} className="stroke-outline-variant/40" /><text x={left - 9} y={lineY + 4} textAnchor="end" className="fill-on-surface-variant text-[11px]">{type === 'occupancy' ? `${tick.toFixed(0)}%` : tick.toFixed(tick < 4 ? 1 : 0)}</text></g>; })}
      <polyline fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className={color} points={line} />
      {points.map((point, index) => <circle key={point.key} tabIndex={0} role="graphics-symbol" aria-label={`${point.label}: ${value(point).toFixed(type === 'occupancy' ? 1 : 0)}${type === 'occupancy' ? '%' : ' booking'}`} cx={x(index)} cy={y(value(point))} r={hovered === index ? 7 : 4.5} className={`${color} cursor-pointer fill-surface stroke-current stroke-[3] outline-none`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)}><title>{point.label}: {value(point).toFixed(type === 'occupancy' ? 1 : 0)}{type === 'occupancy' ? '%' : ' booking'}</title></circle>)}
      <XLabels points={points} left={left} top={height - 18} plotWidth={plotWidth} />
    </svg></div>
  </article>;
};

export const BusinessCharts: React.FC<{ report: BusinessReport }> = ({ report }) => {
  const defaultGrouping: Grouping = report.days.length > 120 ? 'month' : report.days.length > 45 ? 'week' : 'day';
  const [grouping, setGrouping] = useState<Grouping>(defaultGrouping);
  const points = useMemo(() => groupDays(report.days, grouping), [report.days, grouping]);
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Phân tích theo thời gian</h2><p className="text-sm text-on-surface-variant">Từ {report.from} đến trước {report.to} · {points.length} điểm dữ liệu</p></div><GroupingControl value={grouping} onChange={setGrouping} /></div>
    <RevenueChart points={points} />
    <div className="grid gap-5 xl:grid-cols-2"><LineChart points={points} type="bookings" /><LineChart points={points} type="occupancy" /></div>
  </section>;
};
