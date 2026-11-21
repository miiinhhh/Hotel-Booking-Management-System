import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StaffPortalTab } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { getStaffNotifications } from '../../../services/staffPortalApi';
import { PortalNotificationBell } from '../../../components/portal/PortalNotificationBell';
import { STAFF_NAVIGATION } from './StaffSidebar';

interface StaffHeaderProps {
  /** Giữ để tương thích; ô tìm kiếm đã chuyển vào từng trang (Đặt phòng, Khách hàng). */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onLogout?: () => void;
  loggingOut?: boolean;
  currentTab?: StaffPortalTab;
  /** Mở menu trái trên màn hình nhỏ. */
  onOpenMenu?: () => void;
  /** Chuyển tab khi bấm vào thông báo. */
  onNavigateTab?: (tab: StaffPortalTab) => void;
  /** Các phân khu nhân viên được phân công, hiện trong popover trên header. */
  assignedAreas?: { areaId: string | number; hotelId?: string | number; hotelName?: string; areaName: string; totalRooms?: number }[];
}

const AssignedAreasChip: React.FC<{ areas: NonNullable<StaffHeaderProps['assignedAreas']> }> = ({ areas }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const groups = areas.reduce<Record<string, typeof areas>>((acc, a) => {
    const key = a.hotelName || 'Khách sạn';
    (acc[key] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="dialog"
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-outline-variant/50 px-3 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
        <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
        <span className="hidden sm:inline">{areas.length} khu vực</span>
        <span className="sm:hidden">{areas.length}</span>
        <span className="material-symbols-outlined text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Khu vực phụ trách"
          className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-xl">
          <p className="mb-3 text-[11px] font-semibold uppercase text-on-surface-variant">Khu vực phụ trách</p>
          {areas.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Bạn chưa được phân công khu vực nào.</p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {Object.entries(groups).map(([hotel, list]) => (
                <div key={hotel}>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>{hotel}
                  </p>
                  <ul className="mt-1.5 space-y-1 pl-6">
                    {list.map(a => (
                      <li key={a.areaId} className="flex items-center justify-between text-sm text-on-surface-variant">
                        <span className="truncate">{a.areaName}</span>                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Loại thông báo Staff → tab xử lý tương ứng
const TAB_BY_TYPE: Record<string, StaffPortalTab> = {
  BookingCreated: 'reservations',
  AreaAssignmentChanged: 'suites',
};

/**
 * Thanh trên cùng của Staff Portal (cao 64px). Chỉ giữ: menu ☰ (màn nhỏ), tên mục đang mở,
 * chuông thông báo, tài khoản và đăng xuất. Bỏ ô tìm kiếm chung vì nó chỉ lọc được tab Đặt phòng.
 */
export const StaffHeader: React.FC<StaffHeaderProps> = ({
  onLogout, loggingOut = false, currentTab = 'reservations', onOpenMenu, onNavigateTab, assignedAreas,
}) => {
  const { session, profile, hasAnyPermission } = useAuth();
  const staffName = profile?.fullName || session?.fullName || 'Nhân viên';
  const initials = staffName.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'NV';
  const current = STAFF_NAVIGATION.find(item => item.id === currentTab);

  const loadNotifications = useCallback(async () => (await getStaffNotifications()).map(n => ({
    id: n.id, title: n.title, description: n.description, icon: n.icon, occurredAt: n.occurredAt,
    isRead: Boolean(n.isRead), type: n.type,
  })), []);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-outline-variant/30 bg-surface/90 px-4 backdrop-blur-xl lg:left-72 lg:px-8">
      <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container lg:hidden" onClick={onOpenMenu} aria-label="Mở menu">
        <span className="material-symbols-outlined">menu</span>
      </button>

      {current && (
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-on-surface">
          <span className="material-symbols-outlined text-[20px] text-primary">{current.icon}</span>
          <span className="truncate">{current.label}</span>
        </p>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {assignedAreas && <AssignedAreasChip areas={assignedAreas} />}
        <PortalNotificationBell
          load={loadNotifications}
          resolveLink={(n) => {
            const tab = TAB_BY_TYPE[(n as { type?: string }).type || ''];
            const nav = STAFF_NAVIGATION.find(item => item.id === tab);
            return nav && onNavigateTab && hasAnyPermission(nav.permissions) ? { label: nav.label, open: () => onNavigateTab(nav.id) } : null;
          }}
        />
        <span className="mx-1 hidden h-6 w-px bg-outline-variant/50 sm:block" aria-hidden="true" />
        <span className="hidden items-center gap-2 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed/60 text-xs font-bold text-primary">{initials}</span>
          <span className="max-w-[160px] truncate text-sm font-medium text-on-surface">{staffName}</span>
        </span>
        <button type="button" disabled={loggingOut} onClick={onLogout} title="Đăng xuất" aria-label="Đăng xuất"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error disabled:cursor-wait disabled:opacity-60">
          <span className={`material-symbols-outlined text-[20px] ${loggingOut ? 'animate-spin' : ''}`}>{loggingOut ? 'progress_activity' : 'logout'}</span>
        </button>
      </div>
    </header>
  );
};
