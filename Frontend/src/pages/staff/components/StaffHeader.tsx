import React, { useEffect, useMemo, useState } from 'react';
import { StaffPortalTab } from '../types';
import { useAuth } from '../../../context/AuthContext';

interface StaffHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notifications?: StaffHeaderNotification[];
  onLogout?: () => void;
  loggingOut?: boolean;
  currentTab?: StaffPortalTab;
}

export interface StaffHeaderNotification {
  id: string;
  title: string;
  description: string;
  time?: string;
  icon: string;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  searchQuery,
  onSearchChange,
  notifications = [],
  onLogout,
  loggingOut = false,
  currentTab = 'reservations',
}) => {
  const { session, profile } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const notificationStorageKey = session?.userId ? `stayluxe.staff.notifications.read.${session.userId}` : null;
  const unreadCount = useMemo(
    () => notifications.filter(notification => !readNotificationIds.has(notification.id)).length,
    [notifications, readNotificationIds],
  );

  useEffect(() => {
    if (!notificationStorageKey) {
      setReadNotificationIds(new Set());
      return;
    }
    try {
      const storedIds = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]') as string[];
      setReadNotificationIds(new Set(Array.isArray(storedIds) ? storedIds : []));
    } catch {
      setReadNotificationIds(new Set());
    }
  }, [notificationStorageKey]);

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds(current => {
      if (current.has(notificationId)) return current;
      const next = new Set(current);
      next.add(notificationId);
      if (notificationStorageKey) {
        localStorage.setItem(notificationStorageKey, JSON.stringify(Array.from(next).slice(-200)));
      }
      return next;
    });
  };
  const staffName = profile?.fullName || session?.fullName || 'Nhân viên';
  const initials = staffName.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'NV';
  const getSearchPlaceholder = () => {
    switch (currentTab) {
      case 'calendar':
        return 'Tìm tình trạng phòng, mã phòng, loại buồng...';
      case 'suites':
        return 'Tìm kiếm tòa nhà, tên phân khu...';
      case 'customers':
        return 'Tìm khách hàng theo Tên, SĐT, Email hoặc Mã CCCD...';
      default:
        return 'Tìm kiếm mã booking #BK, tên khách, số điện thoại, số phòng...';
    }
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#eae8e5]">
      <div className="h-20 w-full px-8 flex items-center justify-between gap-6">
        {/* Left: Global Search & Duty Station Badge */}
        <div className="flex items-center gap-5 flex-1 max-w-2xl">
          <div className="flex items-center gap-2.5 bg-surface-container-low rounded-full px-4 py-2 w-full max-w-md border border-[#eae8e5] focus-within:border-primary-container focus-within:bg-surface-container-lowest transition-all">
            <span className="material-symbols-outlined text-[19px] text-outline">search</span>
            <input
              className="bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline w-full"
              placeholder={getSearchPlaceholder()}
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

        </div>

        {/* Right: Notifications, identity and logout */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button type="button" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)} className="relative w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors border border-[#eae8e5] cursor-pointer" title="Thông báo">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-container px-1 text-[10px] font-bold leading-none text-on-primary">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notificationsOpen && <div className="absolute right-0 top-12 z-[80] w-[min(350px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
              <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-4"><div><h2 className="font-semibold">Thông báo</h2><p className="text-xs text-outline">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc tất cả'}</p></div><button type="button" onClick={() => { setNotificationsOpen(false); setExpandedNotificationId(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container" aria-label="Đóng thông báo"><span className="material-symbols-outlined text-[18px]">close</span></button></div>
              <div className="max-h-[420px] overflow-y-auto p-2">{notifications.length === 0 ? <div className="p-8 text-center text-outline"><span className="material-symbols-outlined mb-2 block text-4xl">notifications_off</span>Chưa có thông báo mới.</div> : notifications.map(item => {
                const expanded = expandedNotificationId === item.id;
                const isRead = readNotificationIds.has(item.id);
                return <button key={item.id} type="button" aria-expanded={expanded} onClick={() => { markNotificationRead(item.id); setExpandedNotificationId(current => current === item.id ? null : item.id); }} className={`mb-1 w-full rounded-xl p-3 text-left transition ${expanded ? 'bg-primary-fixed/40' : isRead ? 'hover:bg-surface-container-low' : 'bg-surface-container-low/60 hover:bg-surface-container'}`}>
                  <div className="flex items-center gap-3"><span className="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[19px] text-primary">{item.icon}</span><h3 className={`min-w-0 flex-1 text-on-surface ${isRead ? 'font-medium' : 'font-semibold'}`}>{item.title}</h3>{isRead ? <span className="text-[11px] text-outline">Đã đọc</span> : <span className="h-2 w-2 shrink-0 rounded-full bg-primary-container" aria-label="Chưa đọc" />}</div>
                  {expanded && <div className="ml-12 mt-2 border-t border-outline-variant/20 pt-2"><p className="text-sm leading-relaxed text-on-surface-variant">{item.description}</p>{item.time && <p className="mt-1 text-xs text-outline">{item.time}</p>}</div>}
                </button>;
              })}</div>
            </div>}
          </div>

          {/* Staff Avatar Dropdown Icon */}
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary ml-1 shadow-sm shrink-0 font-semibold text-sm">
            {initials}
          </div>
          <button
            type="button"
            disabled={loggingOut}
            onClick={onLogout}
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-error hover:bg-error-container disabled:cursor-wait disabled:opacity-60"
            title="Đăng xuất"
          >
            <span className={`material-symbols-outlined text-[20px] ${loggingOut ? 'animate-spin' : ''}`}>
              {loggingOut ? 'progress_activity' : 'logout'}
            </span>
            <span className="hidden 2xl:inline">{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
