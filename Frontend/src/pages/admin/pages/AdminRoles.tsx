import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { permissionApi, PermissionDto, RoleDto } from '../../../services/permissionApi';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';

/* ============================================================================
 * Quy tắc phân quyền (giữ nguyên như trước, khớp SystemPermissions ở Backend)
 * ========================================================================== */

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
  // Không cấp sẵn khi seed; Admin bật khi muốn Staff kiểm duyệt (hiển thị/ẩn) đánh giá
  // tại khách sạn được phân công. Khớp SystemPermissions.AssignableStaff ở Backend.
  'reviews.manage',
]);
/** Chỉ role Admin hệ thống được giữ hai quyền này. */
const RESERVED_CODES = new Set(['roles.manage', 'accounts.manage']);

const allowedCodes = (roleName?: string) => roleName === 'Customer'
  ? CUSTOMER_PERMISSION_CODES
  : roleName === 'Hotel Staff' ? STAFF_PERMISSION_CODES : null;

const permissionsForRole = (role: RoleDto) => {
  const allowed = allowedCodes(role.name);
  return allowed ? role.permissions.filter(code => allowed.has(code)) : role.permissions;
};

const ROLE_ICON: Record<string, string> = { Admin: 'shield_person', 'Hotel Staff': 'badge', Customer: 'person' };

/** Ghi chú ngắn theo vai trò (thay cho 3 khung thông báo lớn trước đây). */
const roleNote = (role: RoleDto) => {
  if (role.name === 'Admin') return 'Vai trò Admin luôn có toàn bộ quyền và được bảo vệ để hệ thống không mất khả năng quản trị.';
  if (role.name === 'Customer') return 'Chỉ hiện các quyền dành cho khách hàng. Tên và trạng thái vai trò được bảo vệ.';
  if (role.name === 'Hotel Staff') return 'Chỉ hiện các quyền vận hành. Quyền khách hàng và quản trị hệ thống không cấp cho nhân viên.';
  return null;
};

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/* ============================================================================
 * Trang
 * ========================================================================== */

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [onlyGranted, setOnlyGranted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 3000); };
  const selected = roles.find(r => r.roleId === selectedId) || null;
  const isAdminRole = selected?.name === 'Admin';
  const original = useMemo(() => (selected ? permissionsForRole(selected) : []), [selected]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [r, p] = await Promise.all([permissionApi.roles(), permissionApi.permissions()]);
      setRoles(r); setPermissions(p);
      const id = selectedId && r.some(x => x.roleId === selectedId) ? selectedId : r.find(x => x.name === 'Hotel Staff')?.roleId || r[0]?.roleId || null;
      const role = r.find(x => x.roleId === id);
      setSelectedId(id); setDraft(role ? permissionsForRole(role) : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được phân quyền.'); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  /* ---------- Thay đổi chưa lưu ---------- */
  const added = draft.filter(c => !original.includes(c));
  const removed = original.filter(c => !draft.includes(c));
  const dirty = !isAdminRole && (added.length > 0 || removed.length > 0);

  const choose = (role: RoleDto) => {
    if (role.roleId === selectedId) return;
    if (dirty && !window.confirm('Bỏ các thay đổi quyền chưa lưu?')) return;
    setSelectedId(role.roleId); setDraft(permissionsForRole(role)); setError(''); setQuery(''); setOnlyGranted(false);
  };

  /* ---------- Nhóm quyền hiển thị ---------- */
  const visiblePermissions = useMemo(() => {
    const allowed = allowedCodes(selected?.name);
    return allowed ? permissions.filter(item => allowed.has(item.code)) : permissions;
  }, [permissions, selected?.name]);

  const granted = (code: string) => isAdminRole || draft.includes(code);
  const editable = (code: string) => !isAdminRole && !RESERVED_CODES.has(code);

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = visiblePermissions.filter(p =>
      (!q || normalize(`${p.name} ${p.code} ${p.description ?? ''} ${p.group}`).includes(q)) && (!onlyGranted || granted(p.code)));
    return Object.entries(filtered.reduce<Record<string, PermissionDto[]>>((all, item) => { (all[item.group] ||= []).push(item); return all; }, {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePermissions, query, onlyGranted, draft, isAdminRole]);

  const toggle = (code: string) => setDraft(current => current.includes(code) ? current.filter(x => x !== code) : [...current, code]);
  const toggleGroup = (items: PermissionDto[], on: boolean) => {
    const codes = items.filter(i => editable(i.code)).map(i => i.code);
    setDraft(current => on ? Array.from(new Set([...current, ...codes])) : current.filter(c => !codes.includes(c)));
  };

  /* ---------- Lưu / tạo / sửa / xóa ---------- */
  const savePermissions = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const allowed = allowedCodes(selected.name);
      const submitted = allowed ? draft.filter(code => allowed.has(code)) : draft;
      const updated = await permissionApi.setPermissions(selected.roleId, submitted);
      setRoles(current => current.map(x => x.roleId === updated.roleId ? updated : x));
      setDraft(permissionsForRole(updated));
      notify('Đã cập nhật quyền. Các phiên bị ảnh hưởng sẽ phải đăng nhập lại.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được quyền.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!selected) return;
    try {
      const updated = await permissionApi.updateRole({ ...selected, isActive: !selected.isActive });
      setRoles(current => current.map(x => x.roleId === updated.roleId ? updated : x));
      notify(updated.isActive ? 'Đã bật vai trò.' : 'Đã tạm khóa vai trò.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật.'); }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true); setModalError('');
    try {
      const role = await permissionApi.createRole(String(data.get('name')).trim(), String(data.get('description') || '').trim());
      setRoles(current => [...current, role]);
      setSelectedId(role.roleId); setDraft(permissionsForRole(role));
      setCreating(false); notify('Đã tạo vai trò. Hãy chọn quyền cho vai trò mới.');
    } catch (e) { setModalError(e instanceof Error ? e.message : 'Không tạo được vai trò.'); }
    finally { setSaving(false); }
  };

  const saveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    setSaving(true); setModalError('');
    try {
      const updated = await permissionApi.updateRole({
        ...selected, name: String(data.get('name')).trim(), description: String(data.get('description') || '').trim() || null,
      });
      setRoles(current => current.map(x => x.roleId === updated.roleId ? updated : x));
      setEditing(false); notify('Đã cập nhật thông tin vai trò.');
    } catch (e) { setModalError(e instanceof Error ? e.message : 'Không cập nhật được vai trò.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!selected) return;
    setSaving(true); setModalError('');
    try {
      await permissionApi.deleteRole(selected.roleId);
      const rest = roles.filter(r => r.roleId !== selected.roleId);
      setRoles(rest);
      const next = rest.find(x => x.name === 'Hotel Staff') || rest[0] || null;
      setSelectedId(next?.roleId ?? null); setDraft(next ? permissionsForRole(next) : []);
      setConfirmDelete(false); notify('Đã xóa vai trò.');
    } catch (e) { setModalError(e instanceof Error ? e.message : 'Không xóa được vai trò.'); }
    finally { setSaving(false); }
  };

  const systemRoles = roles.filter(r => r.isSystem);
  const customRoles = roles.filter(r => !r.isSystem);
  const grantedCount = isAdminRole ? visiblePermissions.length : draft.filter(c => visiblePermissions.some(p => p.code === c)).length;

  const roleButton = (role: RoleDto) => {
    const active = selectedId === role.roleId;
    return (
      <button key={role.roleId} type="button" onClick={() => choose(role)}
        className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary-container text-on-primary' : 'hover:bg-surface-container'} ${role.isActive ? '' : 'opacity-55'}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? 'bg-on-primary/15' : 'bg-primary-fixed/50 text-primary'}`}>
          <span className="material-symbols-outlined text-[18px]">{ROLE_ICON[role.name] ?? 'group'}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{role.name}</span>
          <span className={`block truncate text-xs ${active ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
            {role.userCount} tài khoản · {role.name === 'Admin' ? 'toàn quyền' : `${permissionsForRole(role).length} quyền`}{role.isActive ? '' : ' · tạm khóa'}
          </span>
        </span>
      </button>
    );
  };

  return <>
    <PageHeading title="Vai trò & phân quyền" description="Chọn một vai trò để xem và chỉnh các chức năng được phép." actions={
      <button onClick={() => { setModalError(''); setCreating(true); }} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary">
        <span className="material-symbols-outlined text-[18px]">add</span>Tạo vai trò
      </button>} />

    {error && <p role="alert" className="mb-5 flex items-center justify-between gap-3 rounded bg-error-container p-4 text-on-error-container">{error}<button onClick={() => setError('')} className="font-semibold">Đóng</button></p>}

    {loading ? <p role="status" className="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant shadow-sm">Đang tải phân quyền…</p> :
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ===== Trái: danh sách vai trò ===== */}
        <aside className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm lg:sticky lg:top-20">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-outline">Vai trò hệ thống</p>
          <div className="space-y-1">{systemRoles.map(roleButton)}</div>
          <p className="mb-2 mt-5 px-1 text-xs font-bold uppercase tracking-wider text-outline">Vai trò tùy chỉnh</p>
          {customRoles.length ? <div className="space-y-1">{customRoles.map(roleButton)}</div>
            : <p className="rounded border border-dashed border-outline-variant p-4 text-center text-xs text-on-surface-variant">Chưa có vai trò tùy chỉnh.</p>}
        </aside>

        {/* ===== Phải: chi tiết vai trò ===== */}
        {selected && <section className="min-w-0 rounded-2xl bg-surface-container-lowest shadow-sm">
          {/* Đầu khung */}
          <header className="border-b border-outline-variant/40 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary">
                  <span className="material-symbols-outlined">{ROLE_ICON[selected.name] ?? 'group'}</span>
                </span>
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
                    {selected.name}
                    <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">{selected.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}</span>
                  </h2>
                  <p className="mt-0.5 text-sm text-on-surface-variant">{selected.description || 'Chưa có mô tả.'}</p>
                  <p className="mt-1 text-xs text-outline">{selected.userCount} tài khoản đang dùng vai trò này</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-full bg-surface-container-low py-1 pl-3 pr-1 text-sm">
                  {selected.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                  <Toggle checked={selected.isActive} disabled={selected.isSystem} label="Trạng thái vai trò" onChange={() => void toggleActive()} />
                </label>
                {!selected.isSystem && <>
                  <button type="button" title="Sửa tên & mô tả" onClick={() => { setModalError(''); setEditing(true); }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                  <button type="button" title="Xóa vai trò" onClick={() => { setModalError(''); setConfirmDelete(true); }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-error hover:bg-error-container"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                </>}
              </div>
            </div>
            {roleNote(selected) && (
              <p className="mt-4 flex items-start gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary">info</span>{roleNote(selected)}
              </p>
            )}
          </header>

          {/* Thanh công cụ quyền */}
          <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/40 px-5 py-3 md:px-6">
            <p className="text-sm font-semibold">Quyền <span className="ml-1 rounded-full bg-primary-fixed/60 px-2 py-0.5 text-xs text-primary">{grantedCount}/{visiblePermissions.length}</span></p>
            <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm quyền…" aria-label="Tìm quyền"
                className="w-full rounded-full bg-surface-container-low py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <input type="checkbox" checked={onlyGranted} onChange={e => setOnlyGranted(e.target.checked)} className="h-4 w-4 accent-primary" />
              Chỉ quyền đang bật
            </label>
          </div>

          {/* Nhóm quyền */}
          <div className="grid gap-4 p-5 md:p-6 xl:grid-cols-2">
            {!groups.length && <p className="col-span-full py-8 text-center text-sm text-on-surface-variant">Không có quyền phù hợp.</p>}
            {groups.map(([group, items]) => {
              const on = items.filter(i => granted(i.code)).length;
              const editableItems = items.filter(i => editable(i.code));
              const allOn = editableItems.length > 0 && editableItems.every(i => draft.includes(i.code));
              return (
                <fieldset key={group} className="overflow-hidden rounded border border-outline-variant/40">
                  <legend className="sr-only">{group}</legend>
                  <div className="flex items-center justify-between gap-3 bg-surface-container-low px-4 py-2.5">
                    <p className="text-sm font-semibold">{group} <span className="font-normal text-outline">· {on}/{items.length}</span></p>
                    {!isAdminRole && editableItems.length > 0 && (
                      <button type="button" onClick={() => toggleGroup(items, !allOn)} className="text-xs font-semibold text-primary hover:underline">
                        {allOn ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-outline-variant/30">
                    {items.map(item => {
                      const reserved = RESERVED_CODES.has(item.code) && !isAdminRole;
                      const canEdit = editable(item.code);
                      const changed = added.includes(item.code) || removed.includes(item.code);
                      return (
                        <li key={item.code}>
                          <label className={`flex items-start gap-3 px-4 py-3 ${canEdit ? 'cursor-pointer hover:bg-surface-container-low/60' : 'cursor-default'} ${changed ? 'bg-primary-fixed/20' : ''}`}>
                            <input type="checkbox" checked={granted(item.code)} disabled={!canEdit} onChange={() => toggle(item.code)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-primary disabled:opacity-50" />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                {item.name}
                                {reserved && <span className="material-symbols-outlined text-[16px] text-outline" title="Chỉ role Admin hệ thống được sử dụng">lock</span>}
                                {changed && <span className="rounded bg-primary px-1.5 text-[10px] font-bold uppercase text-on-primary">{added.includes(item.code) ? 'Thêm' : 'Bỏ'}</span>}
                              </span>
                              {item.description && <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">{item.description}</span>}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              );
            })}
          </div>

          {/* Thanh lưu cố định */}
          {!isAdminRole && (
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-outline-variant/40 bg-surface-container-lowest/95 px-5 py-3 backdrop-blur md:px-6">
              <p className="text-sm text-on-surface-variant">
                {dirty
                  ? <><strong className="text-on-surface">Có thay đổi chưa lưu:</strong> {added.length > 0 && <span className="text-emerald-700">+{added.length} quyền</span>}{added.length > 0 && removed.length > 0 && ' · '}{removed.length > 0 && <span className="text-error">−{removed.length} quyền</span>}</>
                  : 'Chưa có thay đổi'}
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={!dirty || saving} onClick={() => setDraft(original)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-40">Hoàn tác</button>
                <button type="button" disabled={!dirty || saving} onClick={() => void savePermissions()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-on-primary disabled:opacity-40">
                  {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}Lưu phân quyền
                </button>
              </div>
            </div>
          )}
        </section>}
      </div>}

    {/* ===== Tạo vai trò ===== */}
    <Modal title="Tạo vai trò" open={creating} onClose={() => { if (!saving) setCreating(false); }}>
      <form onSubmit={create} className="space-y-4">
        {modalError && <p role="alert" className="rounded bg-error-container p-3 text-sm text-on-error-container">{modalError}</p>}
        <label className="block text-sm font-semibold">Tên vai trò<input name="name" required minLength={2} maxLength={50} autoFocus className="mt-2 h-11 w-full rounded border border-outline-variant bg-surface-container-lowest px-4 font-normal outline-none focus:border-primary" /></label>
        <label className="block text-sm font-semibold">Mô tả<textarea name="description" maxLength={255} className="mt-2 min-h-24 w-full rounded border border-outline-variant bg-surface-container-lowest p-4 font-normal outline-none focus:border-primary" /></label>
        <p className="text-xs text-on-surface-variant">Sau khi tạo, bạn chọn quyền cho vai trò ở khung bên phải.</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setCreating(false)} className="rounded-full bg-surface-container px-5 py-2.5">Hủy</button>
          <button disabled={saving} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary disabled:opacity-50">Tạo vai trò</button>
        </div>
      </form>
    </Modal>

    {/* ===== Sửa thông tin vai trò tùy chỉnh ===== */}
    <Modal title="Sửa vai trò" open={editing} onClose={() => { if (!saving) setEditing(false); }}>
      {selected && <form key={selected.roleId} onSubmit={saveInfo} className="space-y-4">
        {modalError && <p role="alert" className="rounded bg-error-container p-3 text-sm text-on-error-container">{modalError}</p>}
        <label className="block text-sm font-semibold">Tên vai trò<input name="name" required minLength={2} maxLength={50} defaultValue={selected.name} className="mt-2 h-11 w-full rounded border border-outline-variant bg-surface-container-lowest px-4 font-normal outline-none focus:border-primary" /></label>
        <label className="block text-sm font-semibold">Mô tả<textarea name="description" maxLength={255} defaultValue={selected.description ?? ''} className="mt-2 min-h-24 w-full rounded border border-outline-variant bg-surface-container-lowest p-4 font-normal outline-none focus:border-primary" /></label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setEditing(false)} className="rounded-full bg-surface-container px-5 py-2.5">Hủy</button>
          <button disabled={saving} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary disabled:opacity-50">Lưu</button>
        </div>
      </form>}
    </Modal>

    {/* ===== Xóa vai trò tùy chỉnh ===== */}
    <Modal title="Xóa vai trò" open={confirmDelete} onClose={() => { if (!saving) setConfirmDelete(false); }}>
      {selected && <div className="space-y-4">
        {modalError && <p role="alert" className="rounded bg-error-container p-3 text-sm text-on-error-container">{modalError}</p>}
        <p className="text-sm">Xóa vai trò <strong>{selected.name}</strong>?
          {selected.userCount > 0 && <> <strong className="text-error">{selected.userCount} tài khoản</strong> đang dùng vai trò này sẽ mất các quyền tương ứng.</>}
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full bg-surface-container px-5 py-2.5">Hủy</button>
          <button type="button" disabled={saving} onClick={() => void remove()} className="rounded-full bg-error px-5 py-2.5 font-semibold text-on-error disabled:opacity-50">Xóa vai trò</button>
        </div>
      </div>}
    </Modal>

    <Toast message={toast} />
  </>;
};
