import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { authApi, StaffAccount } from '../../../services/authApi';
import { getHotelStaffAssignments, getHotelAreas, syncStaffAreas, StaffAssignedArea } from '../../../services/staffAssignmentApi';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';
import { StaffPagination } from '../components/StaffPagination';

const initials = (name: string) => name.split(' ').filter(Boolean).map(p => p[0]).slice(-2).join('').toUpperCase();

export const AdminStaff: React.FC = () => {
  const { session } = useAuth();
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [areas, setAreas] = useState<StaffAssignedArea[]>([]);
  const [assignments, setAssignments] = useState<Record<number, StaffAssignedArea[]>>({});
  const [hotelId, setHotelId] = useState(1);
  const [hotelInput, setHotelInput] = useState('1');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StaffAccount | null>(null);
  const [areaIds, setAreaIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const pending = useRef(new Set<number>());
  const generation = useRef(0);

  const load = async () => {
    const request = ++generation.current;
    setStaff([]); setAreas([]); setAssignments({}); setSelected(null); setError(''); setLoading(true);
    if (!session) { setLoading(false); return; }
    try {
      const [accounts, areaResult, assignmentResult] = await Promise.all([
        authApi.listAllStaff(session.accessToken), getHotelAreas(hotelId), getHotelStaffAssignments(hotelId),
      ]);
      if (!areaResult.success || !areaResult.data) throw new Error(areaResult.message || 'Không tải được khu vực.');
      if (!assignmentResult.success || !assignmentResult.data) throw new Error(assignmentResult.message || 'Không tải được phân công.');
      if (request !== generation.current) return;
      setStaff(accounts); setAreas(areaResult.data);
      setAssignments(Object.fromEntries(assignmentResult.data.map(m => [m.userId, m.assignedAreas])));
      setPage(1);
    } catch (reason) {
      if (request === generation.current) setError(reason instanceof Error ? reason.message : 'Không tải được nhân viên.');
    } finally { if (request === generation.current) setLoading(false); }
  };

  useEffect(() => { void load(); return () => { generation.current++; }; }, [session?.accessToken, hotelId]);
  useEffect(() => { setPage(1); }, [search, status]);
  const filtered = useMemo(() => staff.filter(m =>
    `${m.fullName} ${m.email} ${m.userId}`.toLowerCase().includes(search.toLowerCase()) &&
    (status === 'all' || m.isActive === (status === 'active'))), [staff, search, status]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 20)));
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const toggleStatus = async (member: StaffAccount) => {
    if (!session || pending.current.has(member.userId)) return;
    pending.current.add(member.userId); setPendingIds([...pending.current]); setError('');
    const request = generation.current;
    try {
      const updated = await authApi.setStaffStatus(session.accessToken, member.userId, !member.isActive);
      if (request !== generation.current) return;
      setStaff(current => current.map(m => m.userId === updated.userId ? updated : m));
      notify(updated.isActive ? 'Đã mở tài khoản.' : 'Đã khóa tài khoản.');
    } catch (reason) {
      if (request === generation.current) setError(reason instanceof Error ? reason.message : 'Không đổi được trạng thái.');
    } finally { pending.current.delete(member.userId); setPendingIds([...pending.current]); }
  };
  const openAssignment = (member: StaffAccount) => {
    setSelected(member); setAreaIds((assignments[member.userId] || []).map(a => a.areaId)); setModalError('');
  };
  const saveAssignment = async () => {
    if (!selected || saving) return;
    const request = generation.current;
    setSaving(true); setModalError('');
    try {
      const result = await syncStaffAreas(hotelId, selected.userId, areaIds);
      if (!result.success || !result.data) throw new Error(result.message || 'Không lưu được phân công.');
      if (request !== generation.current) return;
      setAssignments(current => ({ ...current, [selected.userId]: result.data! }));
      setSelected(null); notify('Đã lưu phân công.');
    } catch (reason) {
      if (request === generation.current) setModalError(reason instanceof Error ? reason.message : 'Không lưu được phân công.');
    } finally { setSaving(false); }
  };
  const managedAreaCount = new Set(Object.values(assignments).flat().map(a => a.areaId)).size;

  return <>
    <PageHeading title="Nhân viên & Phân công khu vực" description="Quản lý tài khoản nhân viên và phân công theo dữ liệu hệ thống." actions={<button disabled={loading || saving} onClick={() => void load()} className="rounded-full bg-surface-container-high px-5 py-2.5 disabled:opacity-50">Làm mới</button>} />
    <form onSubmit={event => { event.preventDefault(); const id = Number(hotelInput); if (Number.isSafeInteger(id) && id > 0) { if (id === hotelId) void load(); else setHotelId(id); } }} className="mb-5 flex items-end gap-3">
      <label className="text-sm font-semibold">Mã khách sạn<input type="number" min="1" step="1" required value={hotelInput} onChange={e => setHotelInput(e.target.value)} className="ml-3 rounded-lg bg-surface-container-low p-2" /></label>
      <button disabled={loading || saving} className="rounded-full bg-primary px-5 py-2 text-on-primary disabled:opacity-50">Xem phân công</button>
    </form>
    <section className="mb-6 grid gap-4 sm:grid-cols-3">{[[staff.length, 'Tổng nhân viên'], [staff.filter(m => m.isActive).length, 'Tài khoản hoạt động'], [managedAreaCount, 'Khu vực đã phân công']].map(([value, label]) => <article key={String(label)} className="rounded-lg bg-surface-container-lowest p-5 shadow-sm"><strong className="text-2xl">{loading ? '…' : value}</strong><p className="text-sm text-outline">{label}</p></article>)}</section>
    <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-xl font-semibold">Danh sách nhân viên</h2><p className="text-sm text-outline">Phân công tại khách sạn #{hotelId}</p></div><div className="flex flex-wrap gap-3"><input aria-label="Tìm nhân viên" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, email, mã nhân viên…" className="rounded-full bg-surface-container-low px-4 py-2" /><select aria-label="Lọc trạng thái" value={status} onChange={e => setStatus(e.target.value)} className="rounded-full bg-surface-container-low px-4 py-2"><option value="all">Mọi trạng thái</option><option value="active">Hoạt động</option><option value="inactive">Tạm khóa</option></select></div></div>
      {error && <p role="alert" className="m-5 rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
      {loading ? <p role="status" className="p-10 text-center">Đang tải nhân viên…</p> : !filtered.length ? <p className="p-10 text-center text-outline">{error ? 'Không thể hiển thị dữ liệu. Vui lòng thử làm mới.' : 'Không có nhân viên phù hợp.'}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-surface-container-low text-outline"><tr>{['Nhân viên', 'Vai trò', 'Khu vực phụ trách', 'Tài khoản', 'Thao tác'].map(h => <th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{visible.map(member => <tr key={member.userId} className="border-t border-outline-variant/20"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-fixed">{initials(member.fullName)}</span><div><p className="font-semibold">{member.fullName} · #{member.userId}</p><p className="text-outline">{member.email}</p></div></div></td><td className="px-5 py-4">{member.roles.join(', ')}</td><td className="px-5 py-4">{(assignments[member.userId] || []).map(a => a.areaName).join(', ') || 'Chưa phân công'}</td><td className="px-5 py-4"><Toggle checked={member.isActive} disabled={pendingIds.includes(member.userId)} label={`Tài khoản ${member.fullName}`} onChange={() => void toggleStatus(member)} /></td><td className="px-5 py-4"><button disabled={!member.isActive} onClick={() => openAssignment(member)} className="rounded-full bg-surface-container px-4 py-2 disabled:opacity-40">Phân công</button></td></tr>)}</tbody></table></div>}
      {!loading && <StaffPagination page={currentPage} total={filtered.length} pageSize={20} onChange={setPage} />}
    </section>
    <Modal title="Phân công khu vực" open={Boolean(selected)} onClose={() => { if (!saving) setSelected(null); }} footer={<><button disabled={saving} onClick={() => setSelected(null)} className="rounded-full bg-surface-container px-5 py-2">Hủy</button><button disabled={saving || !areas.length} onClick={() => void saveAssignment()} className="rounded-full bg-primary px-5 py-2 text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu phân công'}</button></>}>
      <p className="mb-4 font-semibold">{selected?.fullName} · Khách sạn #{hotelId}</p>
      {modalError && <p role="alert" className="mb-4 rounded-lg bg-error-container p-3 text-on-error-container">{modalError}</p>}
      {!areas.length && <p>Khách sạn chưa có khu vực hoạt động.</p>}
      {areas.map(area => <label key={area.areaId} className="mb-2 flex items-center gap-3 rounded-lg bg-surface-container-low p-4"><input type="checkbox" disabled={saving} checked={areaIds.includes(area.areaId)} onChange={e => setAreaIds(current => e.target.checked ? [...current, area.areaId] : current.filter(id => id !== area.areaId))} className="h-5 w-5 accent-primary" /><span>{area.areaName}<small className="block text-outline">{area.totalRooms} phòng</small></span></label>)}
    </Modal>
    <Toast message={toast} />
  </>;
};
