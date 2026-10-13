import React from 'react';

interface StaffHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedZone: string;
  onSelectZone: (zone: string) => void;
  onOpenNotifications?: () => void;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedZone,
  onSelectZone,
  onOpenNotifications,
}) => {
  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#eae8e5]">
      <div className="h-20 w-full px-8 flex items-center justify-between gap-6">
        {/* Left: Global Search & Duty Station Badge */}
        <div className="flex items-center gap-5 flex-1 max-w-2xl">
          <div className="flex items-center gap-2.5 bg-surface-container-low rounded-full px-4 py-2 w-full max-w-md border border-[#eae8e5] focus-within:border-primary-container focus-within:bg-surface-container-lowest transition-all">
            <span className="material-symbols-outlined text-[19px] text-outline">search</span>
            <input
              className="bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline w-full"
              placeholder="Tìm kiếm mã booking #BK, tên khách, số điện thoại, số phòng..."
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-outline hover:text-on-surface text-sm"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Duty Station Badge */}
          <div className="hidden 2xl:flex items-center gap-2 shrink-0">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
              Bàn trực:
            </span>
            <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full border border-[#eae8e5]">
              <span className="w-2 h-2 rounded-full bg-primary-container" />
              <span className="font-label-md text-label-md text-on-surface font-medium">
                Tòa A &amp; B · Quầy Lễ tân 02
              </span>
            </div>
          </div>
        </div>

        {/* Right: Zone Quick Chips & Action Badges */}
        <div className="flex items-center gap-3">
          {/* Zone Filter Chips */}
          <div className="hidden xl:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-[#eae8e5]">
            <button
              type="button"
              onClick={() => onSelectZone('all')}
              className={`px-3.5 py-1 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${
                selectedZone === 'all'
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tất cả phân khu
            </button>
            <button
              type="button"
              onClick={() => onSelectZone('Tòa A')}
              className={`px-3.5 py-1 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${
                selectedZone === 'Tòa A'
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tòa A (Villa/Suite)
            </button>
            <button
              type="button"
              onClick={() => onSelectZone('Tòa B')}
              className={`px-3.5 py-1 rounded-full font-label-sm text-label-sm transition-all cursor-pointer ${
                selectedZone === 'Tòa B'
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tòa B (Deluxe)
            </button>
          </div>

          {/* Notification Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors border border-[#eae8e5] cursor-pointer"
            title="Thông báo mới"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] leading-none flex items-center justify-center font-bold">
              3
            </span>
          </button>

          {/* Quick Filters Icon */}
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors border border-[#eae8e5] cursor-pointer"
            title="Tùy biến bộ lọc"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>

          {/* Staff Avatar Dropdown Icon */}
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary ml-1 shadow-sm shrink-0 font-semibold text-sm">
            MA
          </div>
        </div>
      </div>
    </header>
  );
};
