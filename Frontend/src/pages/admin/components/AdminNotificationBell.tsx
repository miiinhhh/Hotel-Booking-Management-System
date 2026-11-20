import React, { useCallback } from 'react';
import { notificationApi } from '../../../services/notificationApi';
import { ADMIN_NAVIGATION } from '../data/adminData';
import { AdminPage } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { PortalNotificationBell } from '../../../components/portal/PortalNotificationBell';

/** Chuông thông báo Admin: nhóm "Cần xử lý" / "Để ý", bấm vào mở đúng trang xử lý (nếu có quyền). */
export const AdminNotificationBell: React.FC<{ onNavigate: (page: AdminPage) => void }> = ({ onNavigate }) => {
  const { hasAnyPermission } = useAuth();
  const load = useCallback(() => notificationApi.admin(), []);
  const linkTargets = new Map(ADMIN_NAVIGATION.map((item) => [item.id as string, item]));
  return (
    <PortalNotificationBell
      load={load}
      resolveLink={(n) => {
        const link = (n as { link?: string | null }).link;
        const nav = link ? linkTargets.get(link) : undefined;
        return nav && hasAnyPermission(nav.permissions) ? { label: nav.label, open: () => onNavigate(nav.id) } : null;
      }}
    />
  );
};
export default AdminNotificationBell;
