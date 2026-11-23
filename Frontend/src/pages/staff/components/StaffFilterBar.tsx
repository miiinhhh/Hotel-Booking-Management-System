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
  /** Lọc theo khách sạn (chỉ hiện khi có từ 2 khách sạn). */
  hotelOptions?: { id: number; name: string }[];
  selectedHotel?: string;
  onHotelChange?: (hotel: string) => void;
  /** Khoảng ngày lưu trú (yyyy-MM-dd): đơn có kỳ ở giao với khoảng này. */
  dateFrom?: string;
  dateTo?: string;
  onDateChange?: (from: string, to: string) => void;
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

/** Đơn đã hủy đang chờ nhân viên hoàn tiền cho khách. */
export const REFUND_PENDING = 'refund_pending';

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
  hotelOptions = [],
  selectedHotel = 'all',
  onHotelChange,
  dateFrom = '',
  dateTo = '',
  onDateChange,
}) => {
  const filtered = Boolean(searchQuery.trim()) || selectedStatus !== 'all' || selectedZone !== 'all' || selectedHotel !== 'all' || Boolean(dateFrom || dateTo);

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

        {hotelOptions.length > 1 && onHotelChange && (
          <label className="flex h-10 items-center gap-2 rounded-full bg-surface-container-low pl-3.5 pr-1 text-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
            <select aria-label="Khách sạn" value={selectedHotel} onChange={(e) => onHotelChange(e.target.value)}
              className="h-8 max-w-[220px] rounded-full bg-transparent pr-2 font-medium outline-none">
              <option value="all">Mọi khách sạn</option>
              {hotelOptions.map(h => <option key={h.id} value={String(h.id)}>{h.name}</option>)}
            </select>
          </label>
        )}

        {onDateChange && (
          <div className="flex h-10 items-center gap-1.5 rounded-full bg-surface-container-low px-3.5 text-sm" role="group" aria-label="Khoảng ngày lưu trú">
            <span className="material-symbols-outlined text-[18px] text-primary">date_range</span>
            <input type="date" aria-label="Từ ngày" value={dateFrom} max={dateTo || undefined} onChange={(e) => onDateChange(e.target.value, dateTo)}
              className="h-8 w-[8.5rem] bg-transparent outline-none" />
            <span className="text-outline">–</span>
            <input type="date" aria-label="Đến ngày" value={dateTo} min={dateFrom || undefined} onChange={(e) => onDateChange(dateFrom, e.target.value)}
              className="h-8 w-[8.5rem] bg-transparent outline-none" />
          </div>
        )}

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

        {/* Bộ lọc nhanh nghiệp vụ — cùng hàng với ô tìm kiếm */}
        {([
          { id: UPCOMING_REQUESTS, label: 'Khách có ghi chú', icon: 'sticky_note_2', title: 'Khách sắp đến (chưa nhận phòng) có ghi chú khi đặt, xếp theo ngày đến gần nhất', tone: 'text-amber-800', activeTone: 'border-amber-600 bg-amber-50 text-amber-900', badge: 'bg-amber-100' },
          { id: REFUND_PENDING, label: 'Chờ hoàn tiền', icon: 'currency_exchange', title: 'Đơn đã hủy, khách đã thanh toán và đang chờ hoàn tiền', tone: 'text-error', activeTone: 'border-error bg-error-container/40 text-error', badge: 'bg-error-container/70' },
        ]).map(q => {
          const active = selectedStatus === q.id;
          return (
            <button key={q.id} type="button" aria-pressed={active} title={q.title} onClick={() => onStatusChange(active ? 'all' : q.id)}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                active ? q.activeTone : `border-outline-variant/60 ${q.tone} hover:bg-surface-container-low`}`}>
              <span className="material-symbols-outlined text-[18px]">{q.icon}</span>
              {q.label}
              <span className={`rounded-full px-1.5 text-xs font-semibold ${q.badge}`}>{statusCounts[q.id] ?? 0}</span>
            </button>
          );
        })}

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
      </div>
    </section>
  );
};
