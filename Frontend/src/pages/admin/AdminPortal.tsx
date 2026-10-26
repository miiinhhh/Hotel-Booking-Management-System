import React, { useState } from 'react';
import { AdminShell } from './components/AdminShell';
import { AdminInventory } from './pages/AdminInventory';
import { AdminOverview } from './pages/AdminOverview';
import { AdminPricing } from './pages/AdminPricing';
import { AdminStaff } from './pages/AdminStaff';
import { AdminVouchers } from './pages/AdminVouchers';
import { AdminAccounts } from './pages/AdminAccounts';
import { AdminPage } from './types';

interface AdminPortalProps {
  onExit: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExit }) => {
  const [activePage, setActivePage] = useState<AdminPage>('overview');

  const content: Record<AdminPage, React.ReactNode> = {
    overview: <AdminOverview />,
    inventory: <AdminInventory />,
    pricing: <AdminPricing />,
    vouchers: <AdminVouchers />,
    staff: <AdminStaff />,
    accounts: <AdminAccounts />,
  };

  return <AdminShell activePage={activePage} onPageChange={setActivePage} onExit={onExit}>{content[activePage]}</AdminShell>;
};

export default AdminPortal;
