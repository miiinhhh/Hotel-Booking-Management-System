import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { permissionApi, PermissionDto, RoleDto } from '../../../services/permissionApi';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';

const CUSTOMER_PERMISSION_CODES = new Set([
  'profile.self.manage',
  'bookings.self.create',
  'bookings.self.view',
  'bookings.self.cancel',
  'payments.self.manage',
  'reviews.self.manage',
  'wishlist.self.manage',
]);
const STAFF_PERMISSION_CODES = new Set([
  'profile.self.manage',
  'inventory.view',
  'inventory.manage',
  'bookings.view',
  'bookings.manage',
  'payments.view',
  'payments.manage',
  'pricing.view',
  'staff.view',
  'policies.manage',
]);

const allowedCodes = (roleName?: string) => roleName === 'Customer'
  ? CUSTOMER_PERMISSION_CODES
  : roleName === 'Hotel Staff' ? STAFF_PERMISSION_CODES : null;

const permissionsForRole = (role: RoleDto) => {
  const allowed = allowedCodes(role.name);
  return allowed ? role.permissions.filter(code => allowed.has(code)) : role.permissions;
};

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<RoleDto[]>([]); const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null); const [draft, setDraft] = useState<string[]>([]);
  const [creating, setCreating] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [toast, setToast] = useState<string | null>(null);
  const selected = roles.find(r => r.roleId === selectedId) || null;
  const groups = useMemo(() => {
    const allowed = allowedCodes(selected?.name);
    const visible = allowed ? permissions.filter(item => allowed.has(item.code)) : permissions;
    return Object.entries(visible.reduce<Record<string, PermissionDto[]>>((all, item) => { (all[item.group] ||= []).push(item); return all; }, {}));
  }, [permissions, selected?.name]);
  const load = async () => { setLoading(true); setError(''); try { const [r, p] = await Promise.all([permissionApi.roles(), permissionApi.permissions()]); setRoles(r); setPermissions(p); const id = selectedId && r.some(x => x.roleId === selectedId) ? selectedId : r.find(x => x.name === 'Hotel Staff')?.roleId || r[0]?.roleId || null; const role = r.find(x => x.roleId === id); setSelectedId(id); setDraft(role ? permissionsForRole(role) : []); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được phân quyền.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const choose = (role: RoleDto) => { setSelectedId(role.roleId); setDraft(permissionsForRole(role)); setError(''); };
  const toggle = (code: string) => setDraft(current => current.includes(code) ? current.filter(x => x !== code) : [...current, code]);
  const savePermissions = async () => { if (!selected) return; setSaving(true); setError(''); try { const allowed = allowedCodes(selected.name); const submitted = allowed ? draft.filter(code => allowed.has(code)) : draft; const updated = await permissionApi.setPermissions(selected.roleId, submitted); setRoles(current => current.map(x => x.roleId === updated.roleId ? updated : x)); setDraft(permissionsForRole(updated)); setToast('Đã cập nhật quyền. Các phiên bị ảnh hưởng sẽ phải đăng nhập lại.'); } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được quyền.'); } finally { setSaving(false); } };
  const create = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); try { const role = await permissionApi.createRole(String(data.get('name')), String(data.get('description') || '')); setRoles(current => [...current, role]); choose(role); setCreating(false); setToast('Đã tạo vai trò.'); } catch (e) { setError(e instanceof Error ? e.message : 'Không tạo được vai trò.'); } finally { setSaving(false); } };
  const protectedPermissions = selected?.name === 'Admin';
  return <>
    <PageHeading title="Vai trò & phân quyền" description="Tạo nhóm vai trò và chọn từng chức năng được phép." actions={<button onClick={() => setCreating(true)} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary">Tạo vai trò</button>} />
    {error && <p role="alert" className="mb-5 rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    {loading ? <p role="status">Đang tải phân quyền…</p> : <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <section className="rounded-lg bg-surface-container-lowest p-4 shadow-sm"><h2 className="mb-3 text-lg font-semibold">Danh sách vai trò</h2><div className="space-y-2">{roles.map(role => <button key={role.roleId} onClick={() => choose(role)} className={`w-full rounded-lg p-4 text-left ${selectedId === role.roleId ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low hover:bg-surface-container'}`}><span className="flex items-center justify-between gap-2"><strong>{role.name}</strong>{role.isSystem && <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface">Hệ thống</span>}</span><span className="mt-1 block text-xs opacity-75">{role.userCount} tài khoản · {role.permissions.length} quyền</span></button>)}</div></section>
      {selected && <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">{selected.name}</h2><p className="text-sm text-outline">{selected.description || 'Chưa có mô tả.'}</p></div><div className="flex items-center gap-3"><Toggle checked={selected.isActive} disabled={selected.isSystem} label="Trạng thái vai trò" onChange={async () => { try { const updated = await permissionApi.updateRole({ ...selected, isActive: !selected.isActive }); setRoles(current => current.map(x => x.roleId === updated.roleId ? updated : x)); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật.'); } }} /><span className="text-sm">{selected.isActive ? 'Hoạt động' : 'Tạm khóa'}</span></div></div>
        {protectedPermissions && <p className="mb-4 rounded-lg bg-secondary-fixed p-3 text-sm text-on-secondary-fixed">Quyền của role Admin được bảo vệ để tránh hệ thống mất khả năng quản trị.</p>}
        {selected.name === 'Customer' && <p className="mb-4 rounded-lg bg-primary-fixed p-3 text-sm text-on-primary-fixed">Bạn có thể bật hoặc tắt từng chức năng của khách hàng. Tên và trạng thái role Customer vẫn được bảo vệ.</p>}
        {selected.name === 'Hotel Staff' && <p className="mb-4 rounded-lg bg-primary-fixed p-3 text-sm text-on-primary-fixed">Bạn có thể bật hoặc tắt từng chức năng vận hành của nhân viên. Các quyền khách hàng và quản trị hệ thống không được cấp cho Hotel Staff.</p>}
        <div className="space-y-5">{groups.map(([group, items]) => <fieldset key={group} disabled={protectedPermissions}><legend className="mb-2 font-semibold text-primary">{group}</legend><div className="grid gap-2 md:grid-cols-2">{items.map(item => { const reserved = item.code === 'roles.manage' || item.code === 'accounts.manage'; return <label key={item.code} className={`flex gap-3 rounded-lg bg-surface-container-low p-3 ${reserved ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="checkbox" disabled={reserved} checked={draft.includes(item.code)} onChange={() => toggle(item.code)} className="mt-1 h-4 w-4 accent-primary" /><span><strong className="block text-sm">{item.name}</strong><span className="text-xs text-outline">{item.description}{reserved ? ' Chỉ role Admin hệ thống được sử dụng.' : ''}</span></span></label>; })}</div></fieldset>)}</div>
        {!protectedPermissions && <div className="mt-6 flex justify-end"><button disabled={saving} onClick={() => void savePermissions()} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu phân quyền'}</button></div>}
      </section>}
    </div>}
    <Modal title="Tạo vai trò" open={creating} onClose={() => setCreating(false)}><form onSubmit={create} className="space-y-4"><label className="block text-sm font-semibold">Tên vai trò<input name="name" required minLength={2} maxLength={50} className="mt-2 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none" /></label><label className="block text-sm font-semibold">Mô tả<textarea name="description" maxLength={255} className="mt-2 min-h-24 w-full rounded-lg bg-surface-container-low p-4 font-normal outline-none" /></label><div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="rounded-full bg-surface-container px-5 py-2.5">Hủy</button><button disabled={saving} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary">Tạo</button></div></form></Modal>
    <Toast message={toast} />
  </>;
};

