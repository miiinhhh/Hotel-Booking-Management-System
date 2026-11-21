import React from 'react';

interface StaffFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  onResetFilters: () => void;
  zoneOptions?: string[];
  /** Số đơn theo từng trạng thái (khóa giống value bên dưới, 'all' = tổng). */
  statusCounts?: Record<string, number>;
}

/** Nhãn khớp đúng cách StaffBookingsPage ánh xạ trạng thái Backend. */
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending_deposit', label: 'Chờ xác nhận' },
  { value: 'confirmed_deposit', label: 'Đã xác nhận' },
  { value: 'checked_in', label: 'Đang lưu trú' },
  { value: 'staying', label: 'Đã trả phòng' },
  { value: 'cancelled', label: 'Đã hủy' },
];

/**
 * Bộ lọc nghiệp vụ (không phải trạng thái): đơn chưa nhận phòng, ngày đến từ hôm nay, có yêu cầu đặc biệt.
 * Giúp lễ tân / buồng phòng biết cần chuẩn bị gì trước khi khách tới.
 */
export const UPCOMING_REQUESTS = 'upcoming_requests';

export const StaffFilterBar: React.FC<StaffFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedZone,
  onZoneChange,
  onResetFilters,
  zoneOptions = [],
  statusCounts = {},
}) => {
  const filtered = Boolean(searchQuery.trim()) || selectedStatus !== 'all' || selectedZone !== 'all';

  return (
    <section className="space-y-3 rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-outline">search</span>
          <input
            type="search"
            aria-label="Tìm đặt phòng"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Mã đặt phòng, tên khách, số điện thoại, số phòng…"
            className="h-10 w-full rounded-full bg-surface-container-low pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>

        {zoneOptions.length > 1 && (
          <label className="flex h-10 items-center gap-2 rounded-full bg-surface-container-low pl-3.5 pr-1 text-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
            <select aria-label="Phân khu" value={selectedZone} onChange={(e) => onZoneChange(e.target.value)}
              className="h-8 max-w-[220px] rounded-full bg-transparent pr-2 font-medium outline-none">
              <option value="all">Mọi phân khu</option>
              {zoneOptions.map(zone => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </label>
        )}

        {filtered && (
          <button type="button" onClick={onResetFilters}
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-primary hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Lọc theo trạng thái">
        {STATUS_OPTIONS.map(opt => {
          const active = selectedStatus === opt.value;
          return (
            <button key={opt.value} type="button" aria-pressed={active} onClick={() => onStatusChange(opt.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}>
              {opt.label}
              {statusCounts[opt.value] != null && (
                <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-on-primary/20' : 'bg-surface-container-high'}`}>{statusCounts[opt.value]}</span>
              )}
            </button>
          );
        })}
        <span className="mx-1 w-px shrink-0 self-stretch bg-outline-variant/50" aria-hidden="true" />
        {(() => {
          const active = selectedStatus === UPCOMING_REQUESTS;
          return (
            <button type="button" aria-pressed={active} onClick={() => onStatusChange(active ? 'all' : UPCOMING_REQUESTS)}
              title="Đơn chưa nhận phòng, ngày đến từ hôm nay, khách có ghi yêu cầu đặc biệt"
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? 'bg-amber-600 text-white' : 'text-amber-800 hover:bg-amber-50'}`}>
              <span className="material-symbols-outlined text-[16px]">sticky_note_2</span>
              Sắp đến · có yêu cầu
              {statusCounts[UPCOMING_REQUESTS] != null && (
                <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/25' : 'bg-amber-100'}`}>{statusCounts[UPCOMING_REQUESTS]}</span>
              )}
            </button>
          );
        })()}
      </div>
    </section>
  );
};
