import React, { useCallback } from 'react';
import { StaffPortalTab } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { getStaffNotifications } from '../../../services/staffPortalApi';
import { PortalNotificationBell } from '../../../components/portal/PortalNotificationBell';
import { STAFF_NAVIGATION } from './StaffSidebar';

interface StaffHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout?: () => void;
  loggingOut?: boolean;
  currentTab?: StaffPortalTab;
  /** Mở menu trái trên màn hình nhỏ. */
  onOpenMenu?: () => void;
  /** Chuyển tab khi bấm vào thông báo. */
  onNavigateTab?: (tab: StaffPortalTab) => void;
}

// Loại thông báo Staff → tab xử lý tương ứng
const TAB_BY_TYPE: Record<string, StaffPortalTab> = {
  BookingCreated: 'reservations',
  AreaAssignmentChanged: 'suites',
};

const SEARCH_PLACEHOLDER: Partial<Record<StaffPortalTab, string>> = {
  calendar: 'Tìm tình trạng phòng, mã phòng, loại buồng...',
  suites: 'Tìm kiếm tòa nhà, tên phân khu...',
  customers: 'Tìm khách hàng theo Tên, SĐT, Email hoặc Mã CCCD...',
  reviews: 'Tìm kiếm mã booking #BK, tên khách...',
};

/** Thanh trên cùng của Staff Portal — cùng khung với Admin Portal (cao 64px, ☰ trên màn hình nhỏ). */
export const StaffHeader: React.FC<StaffHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onLogout,
  loggingOut = false,
  currentTab = 'reservations',
  onOpenMenu,
  onNavigateTab,
}) => {
  const { session, profile, hasAnyPermission } = useAuth();
  const staffName = profile?.fullName || session?.fullName || 'Nhân viên';
  const initials = staffName.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'NV';

  const loadNotifications = useCallback(async () => (await getStaffNotifications()).map(n => ({
    id: n.id, title: n.title, description: n.description, icon: n.icon, occurredAt: n.occurredAt,
    isRead: Boolean(n.isRead), type: n.type,
  })), []);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between gap-3 bg-surface/90 px-4 shadow-sm backdrop-blur-xl lg:left-72 lg:px-8">
      <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container lg:hidden" onClick={onOpenMenu} aria-label="Mở menu">
        <span className="material-symbols-outlined">menu</span>
      </button>

      <div className="relative hidden max-w-lg flex-1 md:block">
        <span className="material-symbols-outlined absolute left-3 top-2.5 text-xl text-outline">search</span>
        <input
          className="h-10 w-full rounded-full border border-outline-variant/50 bg-surface-container-lowest pl-11 pr-10 outline-none focus:border-primary"
          placeholder={SEARCH_PLACEHOLDER[currentTab] || 'Tìm kiếm mã booking #BK, tên khách, số điện thoại, số phòng...'}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button type="button" aria-label="Xóa tìm kiếm" onClick={() => onSearchChange('')} className="absolute right-3 top-2.5 text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <PortalNotificationBell
          load={loadNotifications}
          resolveLink={(n) => {
            const tab = TAB_BY_TYPE[(n as { type?: string }).type || ''];
            const nav = STAFF_NAVIGATION.find(item => item.id === tab);
            return nav && onNavigateTab && hasAnyPermission(nav.permissions) ? { label: nav.label, open: () => onNavigateTab(nav.id) } : null;
          }}
        />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary" title={staffName}>{initials}</div>
        <button
          type="button"
          disabled={loggingOut}
          onClick={onLogout}
          className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-error hover:bg-error-container disabled:cursor-wait disabled:opacity-60"
          title="Đăng xuất"
        >
          <span className={`material-symbols-outlined text-xl ${loggingOut ? 'animate-spin' : ''}`}>{loggingOut ? 'progress_activity' : 'logout'}</span>
          <span className="hidden xl:inline">{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
        </button>
      </div>
    </header>
  );
};
