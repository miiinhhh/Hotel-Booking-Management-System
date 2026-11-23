import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import type { StaffPortalTab } from '../types';

/** Tab của Staff Portal và quyền tối thiểu để hiển thị tab đó. Nhãn khớp tiêu đề từng trang. */
export const STAFF_NAVIGATION: { id: StaffPortalTab; label: string; icon: string; permissions: readonly string[] }[] = [
  { id: 'reservations', label: 'Đặt phòng', icon: 'event_available', permissions: [PERMISSIONS.bookingView, PERMISSIONS.paymentView] },
  { id: 'calendar', label: 'Lịch phòng & khóa bán', icon: 'calendar_month', permissions: [PERMISSIONS.inventoryView] },
  { id: 'suites', label: 'Phân khu & phòng', icon: 'apartment', permissions: [PERMISSIONS.inventoryView] },
  { id: 'customers', label: 'Khách hàng', icon: 'group', permissions: [PERMISSIONS.bookingView] },
  // Chỉ hiện khi Admin bật quyền reviews.manage cho role Hotel Staff.
  { id: 'reviews', label: 'Đánh giá của khách', icon: 'reviews', permissions: [PERMISSIONS.reviewsManage] },
];

interface StaffSidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigateCustomerPortal?: () => void;
  onOpenProfile?: () => void;
  assignedAreas?: Array<{
    areaId: number;
    hotelId: number;
    hotelName: string;
    areaName: string;
    areaType: string;
    totalRooms?: number;
  }>;
  /** Giữ để tương thích; sidebar không còn hiển thị khu vực phụ trách (đã có ở đầu từng trang). */
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
  onOpenProfile,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { session, profile, hasAnyPermission } = useAuth();
  const staffName = profile?.fullName || session?.fullName || 'Nhân viên';
  const roleLabel = session?.roles?.join(', ') || 'Nhân viên khách sạn';
  const initials = staffName.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'NV';
  const navItems = STAFF_NAVIGATION.filter((item) => hasAnyPermission(item.permissions));

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Đóng menu" className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onCloseMobile} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-4 bg-surface-container-low px-4 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="-mr-2 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]">
          {/* Logo */}
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"><span className="material-symbols-outlined">villa</span></div>
              <div><strong className="block font-headline-sm text-xl">StayLuxe</strong><span className="text-[11px] font-semibold uppercase text-outline">Staff Portal</span></div>
            </div>
            <button type="button" className="lg:hidden" onClick={onCloseMobile} aria-label="Đóng menu"><span className="material-symbols-outlined">close</span></button>
          </div>

          {/* Quyền truy cập */}
          <div className="mx-1 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-3">
            <p className="text-[11px] font-semibold uppercase text-on-surface-variant">Quyền truy cập</p>
            <p className="mt-1 truncate font-semibold" title={roleLabel}>{roleLabel}</p>
            <p className="text-xs text-outline">{session?.permissions?.length ?? 0} quyền được cấp</p>
          </div>

          {/* Menu */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button key={item.id} type="button" aria-current={isActive ? 'page' : undefined}
                  onClick={() => { onSelectTab?.(item.id); onCloseMobile?.(); }}
                  className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm transition-colors ${isActive ? 'bg-primary-container font-semibold text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Tài khoản + về cổng khách hàng */}
        <div className="shrink-0 border-t border-outline-variant/40 pt-4">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-sm font-bold text-primary">{initials}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{staffName}</p><p className="truncate text-xs text-outline">{session?.email || roleLabel}</p></div>
          </div>
          {onOpenProfile && (
            <button type="button" onClick={onOpenProfile} className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
              <span className="material-symbols-outlined text-lg">account_circle</span>Hồ sơ cá nhân
            </button>
          )}
          {onNavigateCustomerPortal && (
            <button type="button" onClick={onNavigateCustomerPortal} className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
              <span className="material-symbols-outlined text-lg">storefront</span>Về cổng khách hàng
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
