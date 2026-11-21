import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StaffCustomer } from '../types';
import { StaffCustomerMetrics } from './StaffCustomerMetrics';
import { StaffCustomerDrawer } from './StaffCustomerDrawer';
import { TierBadge } from './staffUi';
import { getStaffCustomers } from '../../../services/staffPortalApi';

interface StaffCustomersViewProps {
  onShowToast?: (message: string) => void;
}

/** Bỏ bộ lọc "Khách quốc tế": máy chủ hiện luôn trả quốc tịch "Việt Nam" nên bộ lọc luôn rỗng. */
type CustomerFilterTab = 'all' | 'staying' | 'vip' | 'notes';
type CustomerSortOption = 'recent' | 'spend_high' | 'bookings_high' | 'name_asc';

const FILTERS: { id: CustomerFilterTab; label: string; match: (c: StaffCustomer) => boolean }[] = [
  { id: 'all', label: 'Tất cả', match: () => true },
  { id: 'staying', label: 'Đang lưu trú', match: c => c.isStaying },
  { id: 'vip', label: 'Khách VIP', match: c => c.tier === 'GOLD' || c.tier === 'PLATINUM' },
  { id: 'notes', label: 'Có ghi chú khi đặt', match: c => c.serviceNotesTags.length > 0 },
];

const PAGE_SIZES = [10, 25, 50];

export const StaffCustomersView: React.FC<StaffCustomersViewProps> = ({ onShowToast }) => {
  const [customers, setCustomers] = useState<StaffCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<StaffCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<CustomerFilterTab>('all');
  const [sortOption, setSortOption] = useState<CustomerSortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError('');
    getStaffCustomers()
      .then(data => setCustomers(data))
      .catch(reason => { setCustomers([]); setError(reason instanceof Error ? reason.message : 'Không tải được hồ sơ khách hàng.'); })
      .finally(() => setLoading(false));
  };
  // Không tự mở hồ sơ khách đầu tiên khi vào trang (trước đây panel che kín trang ngay khi tải).
  useEffect(load, []);

  // Ctrl/⌘ + K để nhảy tới ô tìm kiếm
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searched = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => [c.name, c.phone, c.email, c.customerCode].some(v => v.toLowerCase().includes(q)));
  }, [customers, searchQuery]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, searched.filter(f.match).length])) as Record<CustomerFilterTab, number>, [searched]);

  const sortedCustomers = useMemo(() => {
    const list = searched.filter(FILTERS.find(f => f.id === activeFilterTab)!.match);
    if (sortOption === 'spend_high') list.sort((a, b) => b.totalSpend - a.totalSpend);
    else if (sortOption === 'bookings_high') list.sort((a, b) => b.totalCompletedBookings - a.totalCompletedBookings);
    else if (sortOption === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return list;
  }, [searched, activeFilterTab, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginated = sortedCustomers.slice((page - 1) * pageSize, page * pageSize);

  const handleExportData = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ['Mã khách', 'Họ tên', 'Điện thoại', 'Email', 'Hạng', 'Đang lưu trú', 'Tổng chi tiêu', 'Số lượt hoàn tất'],
      ...sortedCustomers.map(c => [c.customerCode, c.name, c.phone, c.email, c.tier, c.isStaying ? 'Có' : 'Không', c.totalSpend, c.totalCompletedBookings]),
    ].map(row => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `khach-hang-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    onShowToast?.(`Đã xuất ${sortedCustomers.length} hồ sơ khách hàng.`);
  };

  const resetPage = () => setCurrentPage(1);

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Đầu trang */}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="font-headline-sm text-3xl font-semibold tracking-tight text-on-surface">Khách hàng</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Khách đã đặt phòng tại các khu vực bạn phụ trách.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" title="Tải lại" aria-label="Tải lại" onClick={load} disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-40">
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <button type="button" onClick={handleExportData} disabled={!sortedCustomers.length}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40">
            <span className="material-symbols-outlined text-[18px]">download</span>Xuất CSV
          </button>
        </div>
      </div>

      <StaffCustomerMetrics customers={customers} loading={loading && !customers.length} />

      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-error-container p-4 text-on-error-container">
          {error}<button type="button" onClick={load} className="font-semibold">Thử lại</button>
        </p>
      )}

      {/* Bộ lọc */}
      <section className="space-y-3 rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[240px] flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-outline">search</span>
            <input ref={searchInputRef} type="search" aria-label="Tìm khách hàng" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); resetPage(); }}
              placeholder="Tên, số điện thoại, email hoặc mã khách…"
              className="h-10 w-full rounded-full bg-surface-container-low pl-10 pr-14 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[11px] text-on-surface-variant sm:inline">Ctrl K</kbd>
          </label>
          <label className="flex h-10 items-center gap-2 rounded-full bg-surface-container-low pl-3.5 pr-1 text-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">sort</span>
            <select aria-label="Sắp xếp" value={sortOption} onChange={e => setSortOption(e.target.value as CustomerSortOption)}
              className="h-8 rounded-full bg-transparent pr-2 font-medium outline-none">
              <option value="recent">Mặc định</option>
              <option value="spend_high">Chi tiêu cao nhất</option>
              <option value="bookings_high">Nhiều lượt ở nhất</option>
              <option value="name_asc">Tên A → Z</option>
            </select>
          </label>
        </div>
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Lọc khách hàng">
          {FILTERS.map(f => {
            const active = activeFilterTab === f.id;
            return (
              <button key={f.id} type="button" aria-pressed={active} onClick={() => { setActiveFilterTab(f.id); resetPage(); }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}>
                {f.label}
                <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-on-primary/20' : 'bg-surface-container-high'}`}>{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Danh sách */}
      <section className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-outline-variant/40 bg-surface-container-low text-xs text-on-surface-variant">
              <tr>
                <th scope="col" className="py-3 pl-5 pr-3 font-semibold">Khách hàng</th>
                <th scope="col" className="px-3 py-3 font-semibold">Liên hệ</th>
                <th scope="col" className="px-3 py-3 font-semibold">Lần lưu trú gần nhất</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Chi tiêu</th>
                <th scope="col" className="px-3 py-3 font-semibold">Ghi chú khi đặt</th>
                <th scope="col" className="py-3 pl-3 pr-5"><span className="sr-only">Mở hồ sơ</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant">{loading ? 'hourglass_empty' : 'person_search'}</span>
                    <p className="mt-2 font-medium text-on-surface">
                      {loading ? 'Đang tải khách hàng…' : customers.length ? 'Không có khách phù hợp' : 'Chưa có khách đặt phòng tại khu vực bạn phụ trách'}
                    </p>
                  </td>
                </tr>
              ) : paginated.map(c => (
                <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="cursor-pointer transition-colors hover:bg-surface-container-low/60">
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/50 text-xs font-bold text-primary">
                        {c.initials}
                        {c.isStaying && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-surface-container-lowest" title="Đang lưu trú" />}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-on-surface"><span className="truncate">{c.name}</span><TierBadge tier={c.tier} /></p>
                        <p className="text-xs text-on-surface-variant">{c.customerCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="whitespace-nowrap text-on-surface">{c.phone}</p>
                    <p className="max-w-[200px] truncate text-xs text-on-surface-variant" title={c.email}>{c.email}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    {c.isStaying
                      ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Đang ở{c.currentRoom ? ` · ${c.currentRoom}` : ''}</span>
                      : <span className="text-on-surface">{c.lastStayInfo || '—'}</span>}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <p className="whitespace-nowrap font-semibold tabular-nums text-on-surface">{c.totalSpendFormatted}</p>
                    <p className="text-xs text-on-surface-variant">{c.totalCompletedBookings} lượt hoàn tất</p>
                  </td>
                  <td className="max-w-[240px] px-3 py-3.5">
                    {c.serviceNotesTags.length
                      ? <p className="line-clamp-2 text-xs leading-5 text-on-surface-variant" title={c.serviceNotesTags.join('; ')}>{c.serviceNotesTags.join('; ')}</p>
                      : <span className="text-xs text-outline">—</span>}
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right">
                    <span className="material-symbols-outlined text-[20px] text-outline" aria-hidden="true">chevron_right</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {sortedCustomers.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 px-5 py-3 text-sm text-on-surface-variant">
            <div className="flex items-center gap-3">
              <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedCustomers.length)} / {sortedCustomers.length} khách</span>
              <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); resetPage(); }}
                className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs outline-none">
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / trang</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="px-2 text-on-surface">Trang {page} / {totalPages}</span>
              <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedCustomer && <StaffCustomerDrawer customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
    </div>
  );
};
