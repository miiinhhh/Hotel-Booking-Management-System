import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AdminNotificationDto, notificationApi } from '../../../services/notificationApi';
import { ADMIN_NAVIGATION } from '../data/adminData';
import { AdminPage } from '../types';
import { useAuth } from '../../../context/AuthContext';

const POLL_MS = 60_000;

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return 'Vừa xong';
  if (diff < 60) return `${Math.floor(diff)} phút trước`;
  if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

/** Chuông thông báo Admin: nhóm "Cần xử lý" / "Để ý", trạng thái đã đọc lưu ở server. */
export const AdminNotificationBell: React.FC<{ onNavigate: (page: AdminPage) => void }> = ({ onNavigate }) => {
  const { hasAnyPermission } = useAuth();
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await notificationApi.admin()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được thông báo.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  // Đóng khi bấm ra ngoài / nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;

  const markRead = (ids: string[]) => {
    const fresh = ids.filter((id) => items.some((n) => n.id === id && !n.isRead));
    if (!fresh.length) return;
    setItems((current) => current.map((n) => (fresh.includes(n.id) ? { ...n, isRead: true } : n)));
    void notificationApi.markRead(fresh).catch(() => undefined);
  };

  // Chỉ điều hướng tới trang Admin mà tài khoản có quyền mở.
  const pageFor = (link: string | null) => {
    const nav = ADMIN_NAVIGATION.find((item) => item.id === link);
    return nav && hasAnyPermission(nav.permissions) ? nav.id : null;
  };

  const openItem = (n: AdminNotificationDto) => {
    markRead([n.id]);
    const page = pageFor(n.link);
    if (page) { onNavigate(page); setOpen(false); }
  };

  const groups: { key: 'action' | 'info'; label: string }[] = [
    { key: 'action', label: 'Cần xử lý' },
    { key: 'info', label: 'Để ý' },
  ];

  return (
    <div ref={box} className="relative">
      <button type="button" aria-label="Thông báo" aria-expanded={open} onClick={() => { setOpen((v) => !v); if (!open) void load(); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
        <span className="material-symbols-outlined text-xl">notifications</span>
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-on-primary">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[80] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-3.5">
            <div>
              <h2 className="font-semibold">Thông báo</h2>
              <p className="text-xs text-outline">{unread > 0 ? `${unread} chưa đọc` : 'Đã đọc tất cả'}</p>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && <button type="button" onClick={() => markRead(items.map((n) => n.id))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container">Đọc tất cả</button>}
              <button type="button" aria-label="Làm mới" disabled={loading} onClick={() => void load()} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-50">
                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'refresh'}</span>
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2">
            {error && <p role="alert" className="m-2 rounded-lg bg-error-container p-3 text-xs text-on-error-container">{error}</p>}
            {!items.length && !error ? (
              <div className="p-8 text-center text-outline"><span className="material-symbols-outlined mb-2 block text-4xl">notifications_off</span>{loading ? 'Đang tải…' : 'Không có việc cần chú ý.'}</div>
            ) : groups.map((group) => {
              const list = items.filter((n) => n.severity === group.key);
              if (!list.length) return null;
              return (
                <section key={group.key} className="mb-1">
                  <p className={`px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider ${group.key === 'action' ? 'text-primary' : 'text-outline'}`}>{group.label} ({list.length})</p>
                  {list.map((n) => {
                    const page = pageFor(n.link);
                    return (
                      <button key={n.id} type="button" onClick={() => openItem(n)}
                        className={`mb-1 flex w-full gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-container ${n.isRead ? '' : 'bg-primary-fixed/20'}`}>
                        <span className={`material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[19px] ${group.key === 'action' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{n.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={`min-w-0 flex-1 text-sm text-on-surface ${n.isRead ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                            {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{n.description}</span>
                          <span className="mt-1 flex items-center gap-2 text-[11px] text-outline">
                            {timeAgo(n.occurredAt)}
                            {page && <span className="font-semibold text-primary">· Mở {ADMIN_NAVIGATION.find((x) => x.id === page)?.label} →</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminNotificationBell;
