import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StaffCustomer } from '../types';
import { StaffCustomerMetrics } from './StaffCustomerMetrics';
import { StaffCustomerDrawer } from './StaffCustomerDrawer';
import { getStaffCustomers } from '../../../services/staffPortalApi';

interface StaffCustomersViewProps {
  onShowToast?: (message: string) => void;
}

type CustomerFilterTab = 'all' | 'staying' | 'vip' | 'notes' | 'international';
type CustomerSortOption = 'recent' | 'spend_high' | 'bookings_high' | 'name_asc';

export const StaffCustomersView: React.FC<StaffCustomersViewProps> = ({ onShowToast }) => {
  const [customers, setCustomers] = useState<StaffCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<StaffCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<CustomerFilterTab>('all');
  const [sortOption, setSortOption] = useState<CustomerSortOption>('recent');

  useEffect(() => {
    setLoading(true);
    setError('');
    getStaffCustomers().then((data) => {
      setCustomers(data);
      setSelectedCustomer(data[0] ?? null);
    }).catch((reason) => {
      setCustomers([]);
      setSelectedCustomer(null);
      setError(reason instanceof Error ? reason.message : 'Không tải được hồ sơ khách hàng.');
    }).finally(() => setLoading(false));
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Command+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter & Search Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Filter tab
      if (activeFilterTab === 'staying' && !cust.isStaying) return false;
      if (activeFilterTab === 'vip' && cust.tier !== 'GOLD' && cust.tier !== 'PLATINUM') return false;
      if (activeFilterTab === 'notes' && cust.serviceNotesTags.length === 0) return false;
      if (activeFilterTab === 'international' && cust.country === 'Việt Nam') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = cust.name.toLowerCase().includes(q);
        const matchPhone = cust.phone.toLowerCase().includes(q);
        const matchEmail = cust.email.toLowerCase().includes(q);
        const matchCccd = cust.identityCard.toLowerCase().includes(q);
        const matchCode = cust.customerCode.toLowerCase().includes(q);
        return matchName || matchPhone || matchEmail || matchCccd || matchCode;
      }

      return true;
    });
  }, [customers, activeFilterTab, searchQuery]);

  // Sorted list
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    if (sortOption === 'spend_high') {
      list.sort((a, b) => b.totalSpend - a.totalSpend);
    } else if (sortOption === 'bookings_high') {
      list.sort((a, b) => b.totalCompletedBookings - a.totalCompletedBookings);
    } else if (sortOption === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredCustomers, sortOption]);

  // Paginated list
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize) || 1;

  const handleSelectCustomer = (cust: StaffCustomer) => {
    setSelectedCustomer(cust);
  };

  const handleExportData = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ['Mã khách', 'Họ tên', 'Điện thoại', 'Email', 'Hạng', 'Đang lưu trú', 'Tổng chi tiêu', 'Số booking hoàn tất'],
      ...sortedCustomers.map((item) => [item.customerCode, item.name, item.phone, item.email, item.tier, item.isStaying ? 'Có' : 'Không', item.totalSpend, item.totalCompletedBookings]),
    ].map(row => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `staff-customers-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    onShowToast?.(`Đã xuất ${sortedCustomers.length} hồ sơ khách hàng.`);
  };

  const completedBookings = customers.reduce((sum, item) => sum + item.totalCompletedBookings, 0);
  const totalSpend = customers.reduce((sum, item) => sum + item.totalSpend, 0);
  const returningCustomers = customers.filter(item => item.totalCompletedBookings > 1).length;
  const customerStats = {
    returnRatePercent: customers.length ? Math.round(returningCustomers * 100 / customers.length) : 0,
    returnRateTrend: 'Tính từ dữ liệu booking hiện tại',
    adrAmount: completedBookings ? `${Math.round(totalSpend / completedBookings).toLocaleString('vi-VN')} ₫` : '0 ₫',
    adrSegment: 'Trung bình trên booking hoàn tất',
    verifiedCccdPercent: customers.length ? Math.round(customers.filter(item => item.identityCard).length * 100 / customers.length) : 0,
    verifiedCccdNote: 'Theo dữ liệu hồ sơ đã lưu',
    totalStoredCount: customers.length,
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Bar & Breadcrumbs / Header */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <nav className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
              <span>Nhân viên</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="text-primary font-semibold">Hồ sơ khách hàng &amp; Sở thích phục vụ</span>
            </nav>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                Quản lý Hồ sơ Khách hàng
              </h1>
              <span className="bg-surface-container px-3 py-1 rounded-full font-label-sm text-label-sm text-on-surface-variant font-medium">
                Tổng cộng: {customers.length} khách trong phạm vi phụ trách
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface px-4 py-2.5 rounded-full font-label-lg text-label-lg shadow-sm transition-all border border-[#eae8e5] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Xuất tệp</span>
            </button>
          </div>
        </div>

        {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
        {loading && <p role="status" className="rounded-lg bg-surface-container-low p-4 text-on-surface-variant">Đang tải khách hàng trong phạm vi được phân công…</p>}
        {!loading && !error && customers.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-on-surface-variant">Chưa có khách hàng phát sinh booking trong phạm vi được phân công.</p>}

        {/* Search & Fast Filters Bar */}
        <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 border border-[#eae8e5]">
          {/* Search Input with Command-K indicator */}
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-full flex-1 max-w-xl transition-all focus-within:bg-surface-container-lowest focus-within:shadow-sm border border-[#eae8e5] focus-within:border-primary">
            <span className="material-symbols-outlined text-[20px] text-outline">search</span>
            <input
              ref={searchInputRef}
              className="bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline w-full"
              placeholder="Tìm khách hàng theo Tên, SĐT, Email hoặc Mã CCCD/Hộ chiếu..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-outline hover:text-on-surface text-sm"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-label-sm text-on-surface-variant font-mono">
              ⌘K
            </kbd>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveFilterTab('all');
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-all cursor-pointer ${
                activeFilterTab === 'all'
                  ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Tất cả khách ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTab('staying');
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-all cursor-pointer ${
                activeFilterTab === 'staying'
                  ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Khách đang lưu trú ({customers.filter((c) => c.isStaying).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTab('vip');
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-all cursor-pointer ${
                activeFilterTab === 'vip'
                  ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Khách VIP ({customers.filter((c) => c.tier === 'GOLD' || c.tier === 'PLATINUM').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTab('notes');
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-all cursor-pointer ${
                activeFilterTab === 'notes'
                  ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Có ghi chú đặc biệt ({customers.filter((c) => c.serviceNotesTags.length > 0).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTab('international');
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-all cursor-pointer ${
                activeFilterTab === 'international'
                  ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Khách quốc tế ({customers.filter((c) => c.country !== 'Việt Nam').length})
            </button>
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Sắp xếp:</span>
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as CustomerSortOption)}
                className="appearance-none bg-surface-container-low px-3.5 py-1.5 pr-8 rounded-full text-on-surface font-label-sm text-label-sm cursor-pointer hover:bg-surface-container border border-[#eae8e5] outline-none"
              >
                <option value="recent">Lần lưu trú: Mới nhất</option>
                <option value="spend_high">Chi tiêu: Cao nhất</option>
                <option value="bookings_high">Số lượt hoàn tất: Nhiều nhất</option>
                <option value="name_asc">Tên khách: A - Z</option>
              </select>
              <span className="material-symbols-outlined text-[16px] text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Workspace (Split Layout: 65% Table / Cards + 35% Guest Drawer) */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* Left Column: Master Guest Directory Table (65% / 7 columns) */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-[#eae8e5]">
            {/* Table Scroller */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-left border-collapse">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 pl-6 pr-3 whitespace-nowrap">Khách hàng</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Liên lạc</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Lần nghỉ gần nhất</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Tổng đơn / Chi tiêu</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Ghi chú phục vụ</th>
                    <th className="py-3.5 pr-6 pl-3 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f0ed] text-on-surface font-body-md text-body-md">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-[36px] text-outline block mb-1">
                          person_off
                        </span>
                        Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((cust) => {
                      const isSelected = selectedCustomer?.id === cust.id;
                      return (
                        <tr
                          key={cust.id}
                          onClick={() => handleSelectCustomer(cust)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary-fixed/30 hover:bg-primary-fixed/40'
                              : 'bg-surface-container-lowest hover:bg-surface-container-low'
                          }`}
                        >
                          <td className="py-4 pl-6 pr-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`relative w-10 h-10 rounded-full flex items-center justify-center font-headline-sm text-sm font-bold shadow-sm shrink-0 ${
                                  isSelected
                                    ? 'bg-primary-container text-on-primary'
                                    : 'bg-surface-container-high text-on-surface'
                                }`}
                              >
                                {cust.initials}
                                {cust.isStaying && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-surface-container-lowest" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 font-label-lg text-label-lg font-bold text-on-surface">
                                  <span className="leading-snug">{cust.name}</span>
                                  {cust.tier === 'PLATINUM' && (
                                    <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px] font-label-sm font-bold">
                                      💎 PLATINUM
                                    </span>
                                  )}
                                  {cust.tier === 'GOLD' && (
                                    <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px] font-label-sm font-bold">
                                      ★ GOLD
                                    </span>
                                  )}
                                  {cust.tier === 'SILVER' && (
                                    <span className="bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full text-[10px] font-label-sm font-semibold">
                                      SILVER
                                    </span>
                                  )}
                                </div>
                                <span className="font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px] text-outline">flag</span>
                                  {cust.country}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-3">
                            <div className="flex min-w-0 flex-col gap-1 text-[13px] leading-tight">
                              <span className="font-semibold text-on-surface whitespace-nowrap">{cust.phone}</span>
                              <span className="text-on-surface-variant text-[12px] truncate" title={cust.email}>
                                {cust.email}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-3">
                            <div className="flex min-w-0 flex-col gap-1">
                              {cust.isStaying && cust.currentRoom ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold text-[12px] bg-emerald-100/70 px-2 py-0.5 rounded-full w-max">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                    {cust.currentRoom}
                                  </span>
                                  <span className="truncate text-on-surface-variant text-[11px]" title={cust.lastStayInfo}>
                                    {cust.lastStayInfo}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-on-surface font-medium text-[12px]">
                                    {cust.lastStayInfo.split('(')[0]}
                                  </span>
                                  <span className="text-on-surface-variant text-[11px]">
                                    {cust.lastStayInfo.includes('(')
                                      ? cust.lastStayInfo.slice(cust.lastStayInfo.indexOf('('))
                                      : 'Đã check-out'}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-primary text-[13px] whitespace-nowrap">
                                {cust.totalSpendFormatted}
                              </span>
                              <span className="text-on-surface-variant text-[11px]">
                                {cust.totalCompletedBookings} lượt hoàn tất
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-3">
                            {cust.serviceNotesTags.length ? <p className="line-clamp-3 text-[12px] leading-relaxed text-on-surface-variant" title={cust.serviceNotesTags.join('; ')}>{cust.serviceNotesTags.join('; ')}</p> : <span className="text-[12px] text-outline">Không có ghi chú</span>}
                          </td>

                          <td className="py-4 pr-6 pl-3 text-right">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap bg-primary-container text-on-primary font-label-sm text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                Đang xem
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectCustomer(cust);
                                }}
                                className="whitespace-nowrap text-secondary hover:text-primary font-label-sm text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-surface-container transition-all cursor-pointer"
                              >
                                Xem hồ sơ
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-4 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant font-label-md text-label-md border-t border-[#eae8e5]">
              <div className="flex items-center gap-3">
                <span>
                  Hiển thị{' '}
                  <strong className="text-on-surface font-semibold">
                    {sortedCustomers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, sortedCustomers.length)}
                  </strong>{' '}
                  trong số <strong className="text-on-surface font-semibold">{sortedCustomers.length}</strong> khách
                </span>
                <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-full text-[12px] border border-[#eae8e5]">
                  <span>Hiển thị:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none outline-none font-semibold text-on-surface p-0 cursor-pointer text-[12px]"
                  >
                    <option value={5}>5 hàng</option>
                    <option value={10}>10 hàng</option>
                    <option value={25}>25 hàng</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container disabled:opacity-30 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-full text-[13px] flex items-center justify-center cursor-pointer transition-colors ${
                      currentPage === pg
                        ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container disabled:opacity-30 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick KPI Strip for Customer Relations */}
          <StaffCustomerMetrics stats={customerStats} />
        </div>

        {/* Right Column: Guest Profile Detail Drawer (35% / 5 columns) */}
        {selectedCustomer && <StaffCustomerDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onOpenZaloChat={(phone) => onShowToast?.(`Đang mở cổng trò chuyện Zalo OA với số điện thoại ${phone}...`)}
          onEditCustomer={(c) => onShowToast?.(`Mở biểu mẫu chỉnh sửa hồ sơ khách hàng ${c.name}...`)}
          onViewAllBookings={(id) => onShowToast?.(`Chuyển hướng sang danh sách đầy đủ các booking của khách #${id}...`)}
        />}
      </div>

    </div>
  );
};
