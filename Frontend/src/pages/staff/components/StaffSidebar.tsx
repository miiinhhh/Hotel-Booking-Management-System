import React from 'react';

interface StaffSidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigateCustomerPortal?: () => void;
  assignedAreas?: Array<{
    areaId: number;
    areaName: string;
    areaType: string;
    totalRooms?: number;
  }>;
  activeAreaId?: number;
  onSelectArea?: (areaId: number) => void;
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
  currentTab = 'reservations',
  onSelectTab,
  onNavigateCustomerPortal,
  assignedAreas,
  activeAreaId,
  onSelectArea,
}) => {
  const navItems = [
    { id: 'reservations', label: 'Quản lý Đặt phòng', icon: 'event_available' },
    { id: 'calendar', label: 'Lịch phòng & Khóa bán', icon: 'calendar_month' },
    { id: 'suites', label: 'Suites & Phân khu', icon: 'bed' },
    { id: 'customers', label: 'Hồ sơ Khách hàng', icon: 'group' },
  ];

  const currentArea = assignedAreas?.find((a) => a.areaId === activeAreaId) || assignedAreas?.[0];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between py-7 px-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#eae8e5]">
      <div className="flex flex-col gap-6">
        {/* Logo & Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[20px]">villa</span>
            </div>
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface block tracking-tight leading-tight">
                StayLuxe
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider block">
                Staff Portal
              </span>
            </div>
          </div>
        </div>

        {/* Active Zone Indicator Module */}
        <div className="bg-surface-container rounded-DEFAULT p-3.5 flex flex-col gap-1.5 border border-surface-container-high/80">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
              Active Zone
            </span>
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
          </div>

          {assignedAreas && assignedAreas.length > 1 ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">explore</span>
                <select
                  aria-label="Chọn phân khu phụ trách"
                  value={currentArea?.areaId}
                  onChange={(e) => onSelectArea?.(Number(e.target.value))}
                  className="bg-transparent font-label-md text-label-md text-on-surface font-semibold outline-none cursor-pointer w-full truncate border-b border-outline-variant/40 pb-0.5"
                >
                  {assignedAreas.map((area) => (
                    <option key={area.areaId} value={area.areaId} className="bg-surface-container-lowest text-on-surface">
                      {area.areaName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant pt-0.5">
                <span>{assignedAreas.length} phân khu được giao</span>
                <span className="text-primary font-semibold">{currentArea?.totalRooms ?? 0} phòng</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">explore</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                  {currentArea ? currentArea.areaName : 'Zone A: Royal Pavilion'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant pt-0.5">
                <span>{currentArea?.areaType || 'Tòa A & Tòa B'} · 48 Đơn</span>
                <span className="text-primary font-semibold">
                  {currentArea?.totalRooms ? `${currentArea.totalRooms} Phòng` : '92% Công suất'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab?.(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full font-label-md text-label-md transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(194,65,12,0.22)] font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar Section (Shift Handover & Staff Profile) */}
      <div className="flex flex-col gap-3.5 pt-4 border-t border-[#eae8e5]">
        {/* Switch back to Customer Portal button */}
        {onNavigateCustomerPortal && (
          <button
            type="button"
            onClick={onNavigateCustomerPortal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-[12px] font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Về trang Khách hàng (StayLuxe)</span>
          </button>
        )}

        {/* Shift Detail Card */}
        <div className="bg-surface-container-lowest rounded-DEFAULT p-3.5 shadow-[0_2px_12px_rgba(120,53,15,0.03)] border border-[#eae8e5]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Ca trực Lễ tân
            </span>
            <span className="font-label-sm text-[11px] text-primary font-bold">08:00 - 16:00</span>
          </div>
          <div className="font-body-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Bàn giao ca sáng
          </div>
        </div>

        {/* Staff Profile Row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-[15px] font-semibold shrink-0">
              MA
            </div>
            <div className="leading-tight">
              <div className="font-label-md text-label-md text-on-surface font-semibold">
                Nguyễn Mai Anh
              </div>
              <div className="font-label-sm text-[11px] text-on-surface-variant">Front Office Lead</div>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            title="Cài đặt hệ thống"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
