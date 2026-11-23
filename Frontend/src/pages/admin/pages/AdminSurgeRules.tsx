import React, { FormEvent, useEffect, useState } from 'react';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';
import { surgeRuleApi, SurgeRuleDto, SurgeRuleInput, SurgeAdjustmentType } from '../../../services/hotelAdminApi';
import { getHotelsList, getRoomTypesByHotel, RoomTypeDto } from '../../../services/pricingAdminApi';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import { formatVnd } from '../../../utils/formatters';

type FormState = { roomTypeId: string; ruleName: string; startDate: string; endDate: string; adjustmentType: SurgeAdjustmentType; adjustmentValue: string; priority: string; isActive: boolean };
const EMPTY: FormState = { roomTypeId: '', ruleName: '', startDate: '', endDate: '', adjustmentType: 'PERCENTAGE', adjustmentValue: '', priority: '0', isActive: true };

const d = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const describe = (r: SurgeRuleDto) => r.adjustmentType === 'PERCENTAGE'
  ? `${r.adjustmentValue > 0 ? '+' : ''}${r.adjustmentValue}%`
  : `${r.adjustmentValue > 0 ? '+' : ''}${formatVnd(r.adjustmentValue)}`;

/** Quy tắc tăng/giảm giá theo khoảng ngày (lễ, sự kiện, mùa cao điểm). */
export const AdminSurgeRules: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.pricingManage);
  const [hotels, setHotels] = useState<{ hotelId: number; hotelName: string }[]>([]);
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [rules, setRules] = useState<SurgeRuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<SurgeRuleDto | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SurgeRuleDto | null>(null);

  const notify = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    void getHotelsList().then(res => {
      const items = res.success && res.data ? res.data.items : [];
      setHotels(items);
      if (items.length) setHotelId(items[0].hotelId);
    });
  }, []);

  const load = async (id: number) => {
    setLoading(true); setError('');
    const [r, t] = await Promise.all([surgeRuleApi.list(id), getRoomTypesByHotel(id)]);
    if (r.success && r.data) setRules(r.data); else { setRules([]); setError(r.message || 'Không tải được quy tắc giá.'); }
    setRoomTypes(t.success && t.data ? t.data : []);
    setLoading(false);
  };
  useEffect(() => { if (hotelId) void load(hotelId); }, [hotelId]);

  const open = (rule: SurgeRuleDto | 'new') => {
    setEditing(rule); setFormError('');
    setForm(rule === 'new' ? EMPTY : {
      roomTypeId: rule.roomTypeId ? String(rule.roomTypeId) : '', ruleName: rule.ruleName,
      startDate: rule.startDate.slice(0, 10), endDate: rule.endDate.slice(0, 10), adjustmentType: rule.adjustmentType,
      adjustmentValue: String(rule.adjustmentValue), priority: String(rule.priority), isActive: rule.isActive,
    });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !hotelId || saving) return;
    if (form.endDate < form.startDate) { setFormError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.'); return; }
    const value = Number(form.adjustmentValue);
    if (!Number.isFinite(value) || value === 0) { setFormError('Mức điều chỉnh phải khác 0.'); return; }
    setSaving(true); setFormError('');
    const body = { ruleName: form.ruleName.trim(), startDate: form.startDate, endDate: form.endDate, adjustmentType: form.adjustmentType, adjustmentValue: value, priority: Number(form.priority) || 0, isActive: form.isActive };
    const res = editing === 'new'
      ? await surgeRuleApi.create({ ...body, hotelId, roomTypeId: form.roomTypeId ? Number(form.roomTypeId) : null } as SurgeRuleInput)
      : await surgeRuleApi.update(editing.ruleId, body);
    setSaving(false);
    if (!res.success) { setFormError(res.message || 'Không lưu được quy tắc.'); return; }
    setEditing(null); notify(editing === 'new' ? 'Đã thêm quy tắc giá.' : 'Đã cập nhật quy tắc giá.'); void load(hotelId);
  };

  const toggle = async (rule: SurgeRuleDto) => {
    const res = await surgeRuleApi.toggle(rule.ruleId);
    if (!res.success) { notify(res.message || 'Không đổi được trạng thái.'); return; }
    setRules(rs => rs.map(r => r.ruleId === rule.ruleId ? { ...r, isActive: !r.isActive } : r));
  };

  const remove = async () => {
    if (!deleting || !hotelId) return;
    const res = await surgeRuleApi.remove(deleting.ruleId);
    setDeleting(null);
    notify(res.success ? 'Đã xóa quy tắc.' : res.message || 'Không xóa được quy tắc.');
    if (res.success) void load(hotelId);
  };

  const field = 'mt-1 h-11 w-full rounded-full border border-outline-variant/60 bg-surface-container-low px-4 text-sm font-normal outline-none focus:border-primary';
  const label = 'block text-sm font-semibold text-on-surface';

  return (
    <>
      <PageHeading title="Giá theo mùa & sự kiện" description="Tự động tăng/giảm giá trong khoảng ngày (lễ, sự kiện, cao điểm). Quy tắc ưu tiên cao hơn được áp dụng trước."
        actions={<div className="flex flex-wrap items-center gap-2">
          <select aria-label="Chọn khách sạn" value={hotelId ?? ''} onChange={e => setHotelId(Number(e.target.value))}
            className="h-11 rounded-full border border-outline-variant/60 bg-surface-container-lowest px-4 text-sm">
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
          {canManage && hotelId && (
            <button type="button" onClick={() => open('new')} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90">
              <span className="material-symbols-outlined text-[20px]">add</span>Thêm quy tắc
            </button>
          )}
        </div>} />

      {error && <p role="alert" className="mb-4 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-surface-container-lowest shadow-sm">
        {loading ? <p role="status" className="p-10 text-center text-sm text-on-surface-variant">Đang tải…</p>
          : !rules.length ? <p className="p-10 text-center text-sm text-on-surface-variant">Chưa có quy tắc giá nào cho khách sạn này.</p>
          : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                <tr><th className="px-5 py-3">Tên quy tắc</th><th className="px-5 py-3">Hạng phòng</th><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Điều chỉnh</th><th className="px-5 py-3">Ưu tiên</th><th className="px-5 py-3">Bật</th><th className="px-5 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {rules.map(r => (
                  <tr key={r.ruleId} className={r.isActive ? '' : 'text-on-surface-variant'}>
                    <td className="px-5 py-3 font-semibold text-on-surface">{r.ruleName}</td>
                    <td className="px-5 py-3">{r.roomTypeName ?? 'Tất cả hạng phòng'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{d(r.startDate)} – {d(r.endDate)}</td>
                    <td className={`px-5 py-3 font-semibold ${r.adjustmentValue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{describe(r)}</td>
                    <td className="px-5 py-3">{r.priority}</td>
                    <td className="px-5 py-3">{canManage ? <Toggle checked={r.isActive} label={`Bật ${r.ruleName}`} onChange={() => void toggle(r)} /> : r.isActive ? 'Có' : 'Không'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {canManage && <>
                        <button type="button" onClick={() => open(r)} aria-label={`Sửa ${r.ruleName}`} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined text-[19px]">edit</span></button>
                        <button type="button" onClick={() => setDeleting(r)} aria-label={`Xóa ${r.ruleName}`} className="rounded-full p-2 text-error hover:bg-error-container/50"><span className="material-symbols-outlined text-[19px]">delete</span></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <Modal title={editing === 'new' ? 'Thêm quy tắc giá' : 'Sửa quy tắc giá'} open={editing !== null} onClose={() => { if (!saving) setEditing(null); }}
        footer={<>
          <button type="button" onClick={() => setEditing(null)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
          <button type="submit" form="surge-form" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </>}>
        <form id="surge-form" onSubmit={e => void save(e)} className="grid gap-4 sm:grid-cols-2">
          {formError && <p role="alert" className="sm:col-span-2 rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{formError}</p>}
          <label className={`${label} sm:col-span-2`}>Tên quy tắc *<input required maxLength={200} value={form.ruleName} onChange={e => setForm(f => ({ ...f, ruleName: e.target.value }))} placeholder="VD: Lễ hội pháo hoa DIFF" className={field} /></label>
          <label className={`${label} sm:col-span-2`}>Hạng phòng
            <select disabled={editing !== 'new'} value={form.roomTypeId} onChange={e => setForm(f => ({ ...f, roomTypeId: e.target.value }))} className={`${field} disabled:opacity-60`}>
              <option value="">Tất cả hạng phòng</option>
              {roomTypes.map(t => <option key={t.roomTypeId} value={t.roomTypeId}>{t.name}</option>)}
            </select>
          </label>
          <label className={label}>Từ ngày *<input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={field} /></label>
          <label className={label}>Đến ngày *<input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={field} /></label>
          <label className={label}>Kiểu điều chỉnh
            <select value={form.adjustmentType} onChange={e => setForm(f => ({ ...f, adjustmentType: e.target.value as SurgeAdjustmentType }))} className={field}>
              <option value="PERCENTAGE">Phần trăm (%)</option>
              <option value="FIXED_AMOUNT">Số tiền cố định (₫)</option>
            </select>
          </label>
          <label className={label}>Mức điều chỉnh *<input required type="number" step={form.adjustmentType === 'PERCENTAGE' ? 1 : 1000} value={form.adjustmentValue} onChange={e => setForm(f => ({ ...f, adjustmentValue: e.target.value }))} placeholder={form.adjustmentType === 'PERCENTAGE' ? 'VD: 20 hoặc -10' : 'VD: 200000'} className={field} />
            <span className="mt-1 block text-xs font-normal text-on-surface-variant">Số âm để giảm giá.</span>
          </label>
          <label className={label}>Ưu tiên<input type="number" min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={field} /></label>
          <div className="flex items-end pb-2"><span className="flex items-center gap-3 text-sm font-semibold">Bật quy tắc<Toggle checked={form.isActive} label="Bật quy tắc" onChange={() => setForm(f => ({ ...f, isActive: !f.isActive }))} /></span></div>
        </form>
      </Modal>

      <Modal title="Xóa quy tắc giá?" open={deleting !== null} onClose={() => setDeleting(null)}
        footer={<>
          <button type="button" onClick={() => setDeleting(null)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
          <button type="button" onClick={() => void remove()} className="rounded-full bg-error px-6 py-2.5 font-semibold text-on-error">Xóa</button>
        </>}>
        <p className="text-sm">Quy tắc <b>{deleting?.ruleName}</b> sẽ không còn áp dụng cho đơn mới. Đơn đã đặt giữ nguyên giá.</p>
      </Modal>

      <Toast message={toast} />
    </>
  );
};
export default AdminSurgeRules;
