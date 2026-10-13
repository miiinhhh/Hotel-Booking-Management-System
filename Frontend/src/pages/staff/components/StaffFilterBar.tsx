import React, { useState } from 'react';

interface StaffFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  onResetFilters: () => void;
}

export const StaffFilterBar: React.FC<StaffFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedZone,
  onZoneChange,
  onResetFilters,
}) => {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'confirmed_deposit', label: 'Đã xác nhận cọc' },
    { value: 'pending_deposit', label: 'Chờ cọc' },
    { value: 'checked_in', label: 'Đã check-in' },
    { value: 'staying', label: 'Đang lưu trú' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  const currentStatusLabel =
    statusOptions.find((opt) => opt.value === selectedStatus)?.label || 'Tất cả trạng thái';

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-3 shadow-[0_4px_20px_-2px_rgba(120,53,15,0.03)] border border-[#eae8e5] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
      {/* Search filter input */}
      <div className="relative flex-1 min-w-[280px]">
        <span className="material-symbols-outlined text-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px]">
          search
        </span>
        <input
          className="w-full h-10 pl-10 pr-4 rounded-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-[#eae8e5] focus:outline-none focus:border-primary-container focus:bg-surface-container-lowest transition-all"
          placeholder="Tìm theo Mã booking (#BK-...), Tên khách, Số điện thoại..."
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Dropdowns & Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Filter Picker */}
        <button
          className="h-10 flex items-center gap-2 px-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container border border-[#eae8e5] transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-primary text-[17px]">calendar_today</span>
          <span>Hôm nay, 24/10/2025</span>
          <span className="material-symbols-outlined text-[16px] text-outline">arrow_drop_down</span>
        </button>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="h-10 flex items-center gap-2 px-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container border border-[#eae8e5] transition-colors cursor-pointer"
            type="button"
          >
            <span className="text-on-surface-variant font-normal">Trạng thái:</span>
            <span className="font-semibold text-primary">{currentStatusLabel}</span>
            <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
          </button>

          {statusDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-[#eae8e5] py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onStatusChange(opt.value);
                    setStatusDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 font-label-md text-label-md transition-colors flex items-center justify-between cursor-pointer ${
                    selectedStatus === opt.value
                      ? 'bg-primary-fixed/40 text-primary font-semibold'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedStatus === opt.value && (
                    <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zone / Building Selector */}
        <div className="h-10 flex items-center px-3.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md border border-[#ffb693]/50">
          <span className="material-symbols-outlined text-[16px] text-secondary mr-1.5">apartment</span>
          <span className="font-semibold">
            {selectedZone === 'all'
              ? 'Tòa A & Tòa B'
              : selectedZone}
          </span>
          {selectedZone !== 'all' && (
            <button
              onClick={() => onZoneChange('all')}
              className="ml-2 hover:opacity-75 focus:outline-none flex items-center text-secondary cursor-pointer"
              title="Xem tất cả phân khu"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>

        {/* Reset Filter Button */}
        <button
          onClick={onResetFilters}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container border border-[#eae8e5] transition-colors cursor-pointer"
          title="Đặt lại bộ lọc"
          type="button"
        >
          <span className="material-symbols-outlined text-[19px]">restart_alt</span>
        </button>
      </div>
    </div>
  );
};
