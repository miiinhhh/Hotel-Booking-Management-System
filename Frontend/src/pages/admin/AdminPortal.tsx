import React, { useEffect, useState } from 'react';
import { AdminShell } from './components/AdminShell';
import { AdminInventory } from './pages/AdminInventory';
import { AdminOverview } from './pages/AdminOverview';
import { AdminPricing } from './pages/AdminPricing';
import { AdminStaff } from './pages/AdminStaff';
import { AdminVouchers } from './pages/AdminVouchers';
import { AdminAccounts } from './pages/AdminAccounts';
import { AdminRoles } from './pages/AdminRoles';
import { AdminContent } from './pages/AdminContent';
import { ADMIN_NAVIGATION } from './data/adminData';
import { AdminPage } from './types';
import { useAuth } from '../../context/AuthContext';

interface AdminPortalProps {
  onExit: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExit }) => {
  const { hasAnyPermission } = useAuth();
  const allowedPages = ADMIN_NAVIGATION.filter((item) => hasAnyPermission(item.permissions)).map((item) => item.id);
  const [activePage, setActivePage] = useState<AdminPage>(() => allowedPages[0] ?? 'overview');
  const canOpen = allowedPages.includes(activePage);

  // Khi quyền bị thu hồi (hoặc mở module không được phép), chuyển sang module đầu tiên còn quyền.
  useEffect(() => {
    if (!canOpen && allowedPages.length) setActivePage(allowedPages[0]);
  }, [canOpen, allowedPages.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const content: Record<AdminPage, React.ReactNode> = {
    overview: <AdminOverview />,
    inventory: <AdminInventory />,
    content: <AdminContent />,
    pricing: <AdminPricing />,
    vouchers: <AdminVouchers />,
    staff: <AdminStaff />,
    accounts: <AdminAccounts />,
    roles: <AdminRoles />,
  };

  const page = canOpen ? content[activePage] : !allowedPages.length ? (
    <section className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-3 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary"><span className="material-symbols-outlined text-[28px]">lock_person</span></span>
      <h1 className="font-headline-sm text-headline-sm text-on-surface">Tài khoản chưa được cấp quyền quản trị</h1>
      <p className="text-sm text-on-surface-variant">Vai trò hiện tại của bạn chưa có quyền sử dụng module nào trong Admin Portal. Vui lòng liên hệ quản trị viên hệ thống để được cấp quyền.</p>
    </section>
  ) : null;

  return <AdminShell activePage={activePage} onPageChange={setActivePage} onExit={onExit}>{page}</AdminShell>;
};

export default AdminPortal;
