import React, { useState } from 'react';
import { ADMIN_NAVIGATION } from '../data/adminData';
import { AdminPage } from '../types';
import { useAuth } from '../../../context/AuthContext';

interface AdminShellProps {
  activePage: AdminPage;
  onPageChange: (page: AdminPage) => void;
  onExit: () => void;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ activePage, onPageChange, onExit, children }) => {
  const { session, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (page: AdminPage) => {
    onPageChange(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      {mobileOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between bg-surface-container-low px-4 py-6 shadow-sm transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"><span className="material-symbols-outlined">villa</span></div>
              <div><strong className="block font-headline-sm text-xl">StayLuxe</strong><span className="text-[11px] font-semibold uppercase text-outline">Admin Portal</span></div>
            </div>
            <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="mx-2 rounded-lg border border-outline-variant/40 bg-surface-container p-3">
            <p className="text-[11px] font-semibold uppercase text-on-surface-variant">Quyền truy cập</p>
            <p className="mt-1 font-semibold">Tổng Quản Lý / GM</p><p className="text-xs text-outline">Executive Access Level 1</p>
          </div>
          <nav className="space-y-1.5">
            {ADMIN_NAVIGATION.map((item) => (
              <button key={item.id} onClick={() => navigate(item.id)} className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm transition-colors ${activePage === item.id ? 'bg-primary-container font-semibold text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-xl">{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="border-t border-outline-variant/40 pt-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-container-lowest p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary"><span className="material-symbols-outlined text-lg">shield_person</span></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{session?.fullName || 'Quản trị viên'}</p><p className="truncate text-xs text-outline">{session?.email}</p></div></div>
          <button onClick={onExit} className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined text-lg">storefront</span>Về cổng khách hàng</button>
          <button onClick={() => { logout(); onExit(); }} className="mt-1 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-error hover:bg-error-container"><span className="material-symbols-outlined text-lg">logout</span>Đăng xuất</button>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between bg-surface/90 px-4 shadow-sm backdrop-blur-xl lg:left-72 lg:px-8">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><span className="material-symbols-outlined">menu</span></button>
          <div className="relative hidden max-w-lg flex-1 md:block"><span className="material-symbols-outlined absolute left-3 top-2.5 text-xl text-outline">search</span><input className="h-10 w-full rounded-full border border-outline-variant/50 bg-surface-container-lowest pl-11 pr-4 outline-none focus:border-primary" placeholder="Tìm kiếm trong hệ thống quản trị..." /></div>
          <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-600" />PMS trực tuyến</span><button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container" aria-label="Thông báo"><span className="material-symbols-outlined text-xl">notifications</span><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" /></button><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary"><span className="material-symbols-outlined text-lg">person</span></div></div>
        </header>
        <main className="min-h-screen px-4 pb-16 pt-16 md:px-8">{children}</main>
      </div>
    </div>
  );
};
