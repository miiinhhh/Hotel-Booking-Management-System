import React, { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { authApi, StaffAccount } from '../../../services/authApi';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';

import { StaffPagination } from '../components/StaffPagination';

const initials = (name: string) => name.split(' ').filter(Boolean).map((part) => part[0]).slice(-2).join('').toUpperCase();

export const AdminAccounts: React.FC = () => {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const generation = useRef(0);
  const pending = useRef(new Set<number>());
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    const request = ++generation.current;
    if (!session) { setAccounts([]); setLoading(false); return; }
    setLoading(true); setError(''); setAccounts([]);
    try { const items = await authApi.listAllStaff(session.accessToken); if (request === generation.current) { setAccounts(items); setPage(1); } }
    catch (reason) { if (request === generation.current) setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách tài khoản.'); }
    finally { if (request === generation.current) setLoading(false); }
  };

  useEffect(() => { void load(); return () => { generation.current++; }; }, [session?.accessToken]);

  const filtered = useMemo(() => accounts.filter((account) =>
    `${account.fullName} ${account.email} ${account.phone || ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (status === 'all' || account.isActive === (status === 'active'))
  ), [accounts, search, status]);

  useEffect(() => { setPage(1); }, [search, status]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);

  const notify = (value: string) => { setToast(value); window.setTimeout(() => setToast(null), 2600); };

  const toggleStatus = async (account: StaffAccount) => {
    if (!session || pending.current.has(account.userId)) return;
    try {
      pending.current.add(account.userId); setPendingIds([...pending.current]);
      const updated = await authApi.setStaffStatus(session.accessToken, account.userId, !account.isActive);
      setAccounts((current) => current.map((item) => item.userId === updated.userId ? updated : item));
      notify(updated.isActive ? 'Đã mở lại tài khoản nhân viên.' : 'Đã tạm khóa tài khoản nhân viên.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đổi trạng thái tài khoản.'); } finally { pending.current.delete(account.userId); setPendingIds([...pending.current]); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !editing) return;
    const data = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try {
      const updated = await authApi.updateStaff(session.accessToken, editing.userId, {
        fullName: String(data.get('fullName')),
        phone: String(data.get('phone')),
        dateOfBirth: String(data.get('dateOfBirth')),
      });
      setAccounts((current) => current.map((item) => item.userId === updated.userId ? updated : item));
      setEditing(null); notify('Đã cập nhật thông tin tài khoản.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể cập nhật tài khoản.'); }
    finally { setSaving(false); }
  };

  return <>
    <PageHeading title="Quản trị tài khoản" description="Theo dõi thông tin đăng nhập và kiểm soát trạng thái tài khoản nhân viên khách sạn." actions={<button onClick={() => void load()} className="flex items-center gap-2 rounded-full bg-surface-container-high px-5 py-2.5 font-semibold"><span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>Làm mới</button>} />
    <section className="mb-6 grid gap-4 sm:grid-cols-3">
      {[[accounts.length, 'Tổng tài khoản', 'group'], [accounts.filter((item) => item.isActive).length, 'Đang hoạt động', 'verified_user'], [accounts.filter((item) => !item.isActive).length, 'Tạm khóa', 'person_off']].map(([value, label, icon]) => <article key={String(label)} className="flex items-center gap-4 rounded-lg bg-surface-container-lowest p-5 shadow-sm"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><span className="material-symbols-outlined">{icon}</span></span><div><strong className="font-headline-md text-2xl">{value}</strong><p className="text-sm text-outline">{label}</p></div></article>)}
    </section>
    <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-3 border-b border-outline-variant/30 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-headline-sm text-xl font-semibold">Tài khoản nhân viên</h2><p className="text-sm text-outline">Dữ liệu trực tiếp từ hệ thống tài khoản</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-outline">search</span><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-full bg-surface-container-low pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 sm:w-64" placeholder="Tên, email, số điện thoại..." /></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-full bg-surface-container-low px-4 outline-none"><option value="all">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm khóa</option></select></div></div>
      {error && <div className="m-5 flex items-center justify-between rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container"><span>{error}</span><button onClick={() => setError('')} aria-label="Đóng"><span className="material-symbols-outlined">close</span></button></div>}
      {loading ? <div className="flex min-h-64 items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div> : filtered.length === 0 ? <div className="min-h-64 py-16 text-center text-outline"><span className="material-symbols-outlined text-5xl">manage_accounts</span><p className="mt-3">Không có tài khoản phù hợp.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-surface-container-low text-xs uppercase text-outline"><tr><th className="px-5 py-3">Nhân viên</th><th className="px-5 py-3">Liên hệ</th><th className="px-5 py-3">Vai trò</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody>{visible.map((account) => <tr key={account.userId} className="border-t border-outline-variant/20 hover:bg-surface-container-low/50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-fixed font-semibold text-on-secondary-fixed">{initials(account.fullName)}</div><div><p className="font-semibold">{account.fullName}</p><p className="text-xs text-outline">ID #{account.userId}</p></div></div></td><td className="px-5 py-4"><p>{account.email}</p><p className="text-xs text-outline">{account.phone || 'Chưa cập nhật số điện thoại'}</p></td><td className="px-5 py-4"><div className="flex flex-wrap gap-1">{account.roles.map((role) => <span key={role} className="rounded-full bg-surface-container px-2.5 py-1 text-xs">{role}</span>)}</div></td><td className="px-5 py-4"><div className="flex items-center gap-3"><Toggle disabled={pendingIds.includes(account.userId)} checked={account.isActive} label={`Trạng thái ${account.fullName}`} onChange={() => void toggleStatus(account)} /><span className={account.isActive ? 'text-emerald-700' : 'text-error'}>{account.isActive ? 'Hoạt động' : 'Tạm khóa'}</span></div></td><td className="px-5 py-4 text-right"><button onClick={() => setEditing(account)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary" aria-label={`Sửa ${account.fullName}`}><span className="material-symbols-outlined text-lg">edit</span></button></td></tr>)}</tbody></table></div>}
      <StaffPagination page={currentPage} total={filtered.length} pageSize={20} onChange={setPage} />
    </section>
    <Modal title="Chỉnh sửa tài khoản nhân viên" open={Boolean(editing)} onClose={() => setEditing(null)}>{editing && <form onSubmit={save} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold sm:col-span-2">Họ và tên<input name="fullName" defaultValue={editing.fullName} minLength={2} maxLength={150} required className="mt-2 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20" /></label><label className="text-sm font-semibold">Số điện thoại<input name="phone" defaultValue={editing.phone || ''} maxLength={20} className="mt-2 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20" /></label><label className="text-sm font-semibold">Ngày sinh<input name="dateOfBirth" type="date" defaultValue={editing.dateOfBirth?.slice(0, 10) || ''} max={new Date().toISOString().slice(0, 10)} className="mt-2 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20" /></label><label className="text-sm font-semibold sm:col-span-2">Email<input value={editing.email} readOnly className="mt-2 h-11 w-full cursor-not-allowed rounded-lg bg-surface-container px-4 font-normal text-outline" /></label><div className="mt-2 flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="rounded-full bg-surface-container px-5 py-2.5 font-semibold">Hủy</button><button disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-70">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div></form>}</Modal>
    <Toast message={toast} />
  </>;
};
