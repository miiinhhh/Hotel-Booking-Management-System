import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import type { StaffPortalTab } from '../types';

/** Tab của Staff Portal và quyền tối thiểu để hiển thị tab đó. */
export const STAFF_NAVIGATION: { id: StaffPortalTab; label: string; icon: string; permissions: readonly string[] }[] = [
  { id: 'reservations', label: 'Quản lý Đặt phòng', icon: 'event_available', permissions: [PERMISSIONS.bookingView] },
  { id: 'calendar', label: 'Lịch phòng & Khóa bán', icon: 'calendar_month', permissions: [PERMISSIONS.inventoryView] },
  { id: 'suites', label: 'Suites & Phân khu', icon: 'bed', permissions: [PERMISSIONS.inventoryView] },
  { id: 'customers', label: 'Hồ sơ Khách hàng', icon: 'group', permissions: [PERMISSIONS.bookingView] },
  // Chỉ hiện khi Admin bật quyền reviews.manage cho role Hotel Staff.
  { id: 'reviews', label: 'Đánh giá của khách', icon: 'reviews', permissions: [PERMISSIONS.reviewsManage] },
];

interface StaffSidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigateCustomerPortal?: () => void;
  assignedAreas?: Array<{
    areaId: number;
    hotelId: number;
    hotelName: string;
    areaName: string;
    areaType: string;
    totalRooms?: number;
  }>;
  activeAreaId?: number;
  onSelectArea?: (areaId: number) => void;
  /** Màn hình nhỏ: menu ẩn, mở bằng nút ☰ ở header (giống Admin Portal). */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
  currentTab = 'reservations',
  onSelectTab,
  onNavigateCustomerPortal,
  assignedAreas,
  activeAreaId,
  onSelectArea,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { session, profile, hasAnyPermission } = useAuth();
  const staffName = profile?.fullName || session?.fullName || 'Nhân viên';
  const roleLabel = session?.roles?.join(', ') || 'Nhân viên khách sạn';
  const initials = staffName.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'NV';
  const navItems = STAFF_NAVIGATION.filter((item) => hasAnyPermission(item.permissions));

  const currentArea = assignedAreas?.find((a) => a.areaId === activeAreaId) || assignedAreas?.[0];

  return (
    <>
    {mobileOpen && <button type="button" aria-label="Đóng menu" className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onCloseMobile} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-4 bg-surface-container-low px-4 py-6 shadow-sm transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Phần trên cuộn được khi menu dài; phần tài khoản bên dưới luôn cố định */}
      <div className="-mr-2 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]">
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"><span className="material-symbols-outlined">villa</span></div>
            <div><strong className="block font-headline-sm text-xl">StayLuxe</strong><span className="text-[11px] font-semibold uppercase text-outline">Staff Portal</span></div>
          </div>
          <button type="button" className="lg:hidden" onClick={onCloseMobile} aria-label="Đóng menu"><span className="material-symbols-outlined">close</span></button>
        </div>

        {/* Active Zone Indicator Module */}
        <div className="mx-2 flex flex-col gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-on-surface-variant">
              Khu vực phụ trách
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
                      {area.hotelName} · {area.areaName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant pt-0.5">
                <span>{currentArea?.hotelName}</span>
                <span className="text-primary font-semibold">{currentArea?.totalRooms ?? 0} phòng</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">explore</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                  {currentArea ? currentArea.areaName : 'Chưa được phân công'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant pt-0.5">
                <span>{currentArea?.hotelName || 'Chưa có khách sạn'}</span>
                <span className="text-primary font-semibold">
                  {currentArea?.totalRooms ? `${currentArea.totalRooms} Phòng` : '0 phòng'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelectTab?.(item.id); onCloseMobile?.(); }}
                className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm transition-colors ${isActive ? 'bg-primary-container font-semibold text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tài khoản + về cổng khách hàng (giống Admin Portal) */}
      <div className="shrink-0 border-t border-outline-variant/40 pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-container-lowest p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">{initials}</div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{staffName}</p><p className="truncate text-xs text-outline">{session?.email || roleLabel}</p></div>
        </div>
        {onNavigateCustomerPortal && (
          <button type="button" onClick={onNavigateCustomerPortal} className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-lg">storefront</span>Về cổng khách hàng
          </button>
        )}
      </div>
    </aside>
    </>
  );
};
