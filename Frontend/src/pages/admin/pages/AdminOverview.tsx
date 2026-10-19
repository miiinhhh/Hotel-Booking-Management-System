import React, { useState } from 'react';
import { PageHeading, Toast } from '../components/AdminUi';

const metrics = [
  { label: 'Tổng doanh thu', value: '4,82 tỷ ₫', change: '+18,4%', icon: 'payments', note: 'So với tháng trước' },
  { label: 'Công suất phòng', value: '78,6%', change: '+6,2%', icon: 'hotel', note: '162 / 205 phòng' },
  { label: 'Tổng lượt đặt', value: '1.248', change: '+12,7%', icon: 'calendar_month', note: '412 đơn đang lưu trú' },
  { label: 'Tỷ lệ hủy', value: '4,3%', change: '-1,8%', icon: 'event_busy', note: 'Trong ngưỡng mục tiêu' },
];

const transactions = [
  ['#SL-20261082', 'Nguyễn Hải Yến', 'Premier Ocean Suite', '18.450.000 ₫', 'Đã thanh toán'],
  ['#SL-20261077', 'Trần Minh Khoa', 'Beachfront Pool Villa', '32.800.000 ₫', 'Đã cọc'],
  ['#SL-20261069', 'Lê Khánh Linh', 'Deluxe Garden View', '9.600.000 ₫', 'Đã thanh toán'],
  ['#SL-20261054', 'Phạm Anh Tú', 'Presidential Sea Suite', '50.000.000 ₫', 'Chờ đối soát'],
];

export const AdminOverview: React.FC = () => {
  const [period, setPeriod] = useState('Tháng này');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const sync = () => { setSyncing(true); window.setTimeout(() => { setSyncing(false); showToast('Đã đồng bộ dữ liệu mới nhất từ Opera PMS.'); }, 900); };

  return <>
    <PageHeading title="Tổng quan kinh doanh" description="Theo dõi hiệu suất vận hành, doanh thu và công suất toàn bộ hệ thống StayLuxe." actions={<><button onClick={sync} className="flex items-center gap-2 rounded-full bg-surface-container-high px-5 py-2.5 font-semibold"><span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`}>sync</span>{syncing ? 'Đang đồng bộ' : 'Đồng bộ PMS'}</button><button onClick={() => showToast('Báo cáo quản trị đã sẵn sàng để tải xuống.')} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary"><span className="material-symbols-outlined text-lg">download</span>Xuất báo cáo</button></>} />

    <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
      <div className="flex flex-wrap gap-1">{['Hôm nay', '7 ngày', 'Tháng này', 'Tùy chọn'].map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === item ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}>{item}</button>)}</div>
      <label className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-lg">apartment</span><select className="bg-transparent font-semibold text-on-surface outline-none"><option>Tất cả phân khu</option><option>Tòa A - Sunrise</option><option>Khu Villa Ven Biển</option></select></label>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article key={metric.label} className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm"><div className="mb-5 flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary"><span className="material-symbols-outlined">{metric.icon}</span></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${metric.change.startsWith('-') ? 'bg-emerald-100 text-emerald-800' : 'bg-primary-fixed text-primary'}`}>{metric.change}</span></div><p className="text-sm text-on-surface-variant">{metric.label}</p><p className="mt-1 font-headline-md text-3xl font-semibold">{metric.value}</p><p className="mt-3 text-xs text-outline">{metric.note}</p></article>)}</section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      <article className="rounded-lg bg-surface-container-lowest p-6 shadow-sm"><div className="mb-7 flex items-start justify-between"><div><h2 className="font-headline-sm text-xl font-semibold">Phân bổ doanh thu theo phân khu</h2><p className="text-sm text-outline">Đơn vị: triệu đồng · {period}</p></div><span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">ADR 5,2 triệu ₫</span></div><div className="flex h-64 items-end gap-4 border-b border-outline-variant/50 px-2 sm:gap-8">{[58, 76, 65, 92, 84, 70, 96, 88].map((height, index) => <div key={index} className="flex h-full flex-1 items-end gap-1"><div title={`Doanh thu ${height * 7} triệu`} className="w-1/2 rounded-t-md bg-primary-container transition-opacity hover:opacity-75" style={{ height: `${height}%` }} /><div className="w-1/2 rounded-t-md bg-secondary-container" style={{ height: `${Math.max(20, height - 22)}%` }} /></div>)}</div><div className="mt-3 flex justify-between text-xs text-outline"><span>Tuần 1</span><span>Tuần 2</span><span>Tuần 3</span><span>Tuần 4</span></div><div className="mt-5 flex flex-wrap gap-4 text-xs"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-primary-container" />Phòng & Villa</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-secondary-container" />Dịch vụ bổ sung</span></div></article>
      <article className="rounded-lg bg-surface-container-lowest p-6 shadow-sm"><h2 className="font-headline-sm text-xl font-semibold">Công suất theo hạng phòng</h2><p className="text-sm text-outline">Trung bình toàn hệ thống</p><div className="my-7 flex justify-center"><div className="flex h-40 w-40 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#c2410c 0 34%, #fd9e70 34% 62%, #983311 62% 80%, #e4e2df 80%)' }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl">78,6%</strong><span className="text-xs text-outline">công suất</span></div></div></div><div className="space-y-3">{[['Premier Ocean Suite', '86%'], ['Beachfront Pool Villa', '81%'], ['Deluxe Ocean & Garden', '74%'], ['Presidential Suite', '59%']].map(([name, value]) => <div key={name} className="flex justify-between text-sm"><span className="text-on-surface-variant">{name}</span><strong>{value}</strong></div>)}</div></article>
    </section>

    <section className="mt-6 overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm"><div className="flex items-center justify-between border-b border-outline-variant/30 p-6"><div><h2 className="font-headline-sm text-xl font-semibold">Giao dịch gần đây</h2><p className="text-sm text-outline">Cập nhật theo thời gian thực từ PMS</p></div><button className="text-sm font-semibold text-primary">Xem tất cả</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-container-low text-xs uppercase text-outline"><tr>{['Mã đặt phòng', 'Khách hàng', 'Hạng phòng', 'Giá trị', 'Trạng thái'].map((h) => <th key={h} className="px-6 py-3">{h}</th>)}</tr></thead><tbody>{transactions.map((row) => <tr key={row[0]} className="border-t border-outline-variant/20 hover:bg-surface-container-low/60">{row.map((cell, i) => <td key={cell} className={`px-6 py-4 ${i === 0 || i === 3 ? 'font-semibold' : ''}`}>{i === 4 ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></section>
    <Toast message={toast} />
  </>;
};
