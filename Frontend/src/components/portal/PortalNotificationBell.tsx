import React, { useCallback, useEffect, useRef, useState } from 'react';
import { notificationApi } from '../../services/notificationApi';

export interface PortalNotification {
  id: string;
  title: string;
  description: string;
  icon: string;
  occurredAt: string;
  isRead: boolean;
  /** 'action' = Cần xử lý, 'info' = Để ý. Không có → hiển thị chung một nhóm "Mới nhất". */
  severity?: 'action' | 'info';
}

export interface NotificationLink { label: string; open: () => void }

interface Props {
  load: () => Promise<PortalNotification[]>;
  /** Trang/tab để xử lý thông báo; null nếu không có (hoặc không có quyền). */
  resolveLink?: (item: PortalNotification) => NotificationLink | null;
  pollMs?: number;
}

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return 'Vừa xong';
  if (diff < 60) return `${Math.floor(diff)} phút trước`;
  if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

/**
 * Chuông thông báo dùng chung cho Admin Portal và Staff Portal.
 * Trạng thái đã đọc lưu ở server (POST /api/notifications/read) nên đồng bộ giữa các thiết bị.
 */
export const PortalNotificationBell: React.FC<Props> = ({ load, resolveLink, pollMs = 60_000 }) => {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems(await loadRef.current()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được thông báo.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

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

  const openItem = (n: PortalNotification) => {
    markRead([n.id]);
    const link = resolveLink?.(n);
    if (link) { link.open(); setOpen(false); }
  };

  const hasSeverity = items.some((n) => n.severity);
  const groups = hasSeverity
    ? [{ key: 'action', label: 'Cần xử lý', list: items.filter((n) => n.severity === 'action') },
       { key: 'info', label: 'Để ý', list: items.filter((n) => n.severity !== 'action') }]
    : [{ key: 'all', label: 'Mới nhất', list: items }];

  return (
    <div ref={box} className="relative">
      <button type="button" aria-label="Thông báo" aria-expanded={open} onClick={() => { setOpen((v) => !v); if (!open) void refresh(); }}
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
              <button type="button" aria-label="Làm mới" disabled={loading} onClick={() => void refresh()} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-50">
                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'refresh'}</span>
              </button>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2">
            {error && <p role="alert" className="m-2 rounded-lg bg-error-container p-3 text-xs text-on-error-container">{error}</p>}
            {!items.length && !error ? (
              <div className="p-8 text-center text-outline"><span className="material-symbols-outlined mb-2 block text-4xl">notifications_off</span>{loading ? 'Đang tải…' : 'Chưa có thông báo mới.'}</div>
            ) : groups.map((group) => !group.list.length ? null : (
              <section key={group.key} className="mb-1">
                <p className={`px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider ${group.key === 'action' ? 'text-primary' : 'text-outline'}`}>{group.label} ({group.list.length})</p>
                {group.list.map((n) => {
                  const link = resolveLink?.(n);
                  const urgent = n.severity === 'action';
                  return (
                    <button key={n.id} type="button" onClick={() => openItem(n)}
                      className={`mb-1 flex w-full gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-container ${n.isRead ? '' : 'bg-primary-fixed/20'}`}>
                      <span className={`material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[19px] ${urgent || !n.severity ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{n.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`min-w-0 flex-1 text-sm text-on-surface ${n.isRead ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                          {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{n.description}</span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-outline">
                          {timeAgo(n.occurredAt)}
                          {link && <span className="font-semibold text-primary">· Mở {link.label} →</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default PortalNotificationBell;
