import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';
import { hotelAdminApi, HotelAdminDto, HotelInput } from '../../../services/hotelAdminApi';
import { discoveryApi, defaultSelection } from '../../../services/discoveryApi';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import { AdminPage } from '../types';

interface AdminHotelsProps {
  /** Chuyển sang module khác (Phân khu, Tiện ích & ảnh, Giá phòng). */
  onNavigate?: (page: AdminPage) => void;
}

const EMPTY: HotelInput = {
  hotelName: '', description: '', address: '', city: 'Đà Nẵng', country: 'Vietnam', phone: '', email: '', website: '',
  checkInTime: '14:00:00', checkOutTime: '12:00:00', isActive: true,
};

const hhmm = (time: string) => time.slice(0, 5);
const toTime = (value: string) => (value.length === 5 ? `${value}:00` : value);

/**
 * Quản lý khách sạn: danh sách, thêm, sửa (kèm chính sách hủy hiển thị cho khách) và ngừng/kích hoạt.
 * Không có nút xóa hẳn: dữ liệu đơn và đánh giá gắn với khách sạn — ngừng hoạt động là cách an toàn.
 * Máy chủ chặn ngừng hoạt động khi khách sạn còn đơn chưa hoàn tất.
 */
export const AdminHotels: React.FC<AdminHotelsProps> = ({ onNavigate }) => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.hotelManage);
  const [hotels, setHotels] = useState<HotelAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState<HotelAdminDto | 'new' | null>(null);
  const [form, setForm] = useState<HotelInput>(EMPTY);
  const [policy, setPolicy] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmToggle, setConfirmToggle] = useState<HotelAdminDto | null>(null);
  const [toggleError, setToggleError] = useState('');

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };

  const load = async () => {
    setLoading(true); setError('');
    const res = await hotelAdminApi.list();
    if (res.success && res.data) setHotels(res.data.items);
    else setError(res.message || 'Không tải được danh sách khách sạn.');
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hotels.filter(h => (status === 'all' || (status === 'active') === h.isActive)
      && (!q || [h.hotelName, h.address, h.city, h.phone, h.email].some(v => v?.toLowerCase().includes(q))));
  }, [hotels, search, status]);

  const openEditor = async (hotel: HotelAdminDto | 'new') => {
    setEditing(hotel); setFormError('');
    if (hotel === 'new') { setForm(EMPTY); setPolicy(''); return; }
    const { hotelId: _id, createdAt: _c, updatedAt: _u, ...rest } = hotel;
    setForm({ ...rest, description: rest.description ?? '', website: rest.website ?? '' });
    setPolicy('');
    // Chính sách hủy đang hiển thị cho khách (đọc qua trang chi tiết công khai; khách sạn ngừng hoạt động có thể không đọc được).
    try { setPolicy((await discoveryApi.detail(hotel.hotelId, defaultSelection())).policies.cancellationPolicy ?? ''); } catch { /* để trống */ }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !editing) return;
    setSaving(true); setFormError('');
    const input: HotelInput = {
      ...form,
      hotelName: form.hotelName.trim(), address: form.address.trim(), city: form.city.trim(), country: form.country.trim(),
      phone: form.phone.trim(), email: form.email.trim(),
      description: form.description?.trim() || null, website: form.website?.trim() || null,
      checkInTime: toTime(form.checkInTime), checkOutTime: toTime(form.checkOutTime),
    };
    const res = editing === 'new' ? await hotelAdminApi.create(input) : await hotelAdminApi.update(editing.hotelId, input);
    if (!res.success || !res.data) { setFormError(res.message || 'Không lưu được khách sạn.'); setSaving(false); return; }
    const policyRes = await hotelAdminApi.setPolicy(res.data.hotelId, policy.trim() || null);
    setSaving(false); setEditing(null);
    notify(policyRes.success ? (editing === 'new' ? 'Đã thêm khách sạn.' : 'Đã cập nhật khách sạn.') : 'Đã lưu khách sạn nhưng chưa lưu được chính sách hủy.');
    void load();
  };

  const toggleActive = async (hotel: HotelAdminDto) => {
    setToggleError('');
    const { hotelId, createdAt: _c, updatedAt: _u, ...rest } = hotel;
    const res = await hotelAdminApi.update(hotelId, { ...rest, isActive: !hotel.isActive });
    if (!res.success) { setToggleError(res.message || 'Không đổi được trạng thái.'); return; }
    setConfirmToggle(null);
    notify(hotel.isActive ? `Đã ngừng hoạt động ${hotel.hotelName}.` : `Đã kích hoạt lại ${hotel.hotelName}.`);
    void load();
  };

  const field = 'mt-1 h-11 w-full rounded-full border border-outline-variant/60 bg-surface-container-low px-4 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
  const label = 'block text-sm font-semibold text-on-surface';
  const set = (key: keyof HotelInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <PageHeading title="Khách sạn" description="Thêm, sửa thông tin, chính sách hủy và trạng thái hoạt động của từng khách sạn."
        actions={canManage ? (
          <button type="button" onClick={() => void openEditor('new')} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90">
            <span className="material-symbols-outlined text-[20px]">add</span>Thêm khách sạn
          </button>
        ) : undefined} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
        <label className="relative min-w-[220px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-outline">search</span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, địa chỉ, điện thoại, email…" aria-label="Tìm khách sạn"
            className="h-10 w-full rounded-full bg-surface-container-low pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <div className="inline-flex rounded-full bg-surface-container-low p-1 text-sm">
          {([['all', 'Tất cả'], ['active', 'Đang hoạt động'], ['inactive', 'Ngừng hoạt động']] as const).map(([id, text]) => (
            <button key={id} type="button" onClick={() => setStatus(id)}
              className={`rounded-full px-4 py-1.5 font-medium ${status === id ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm' : 'text-on-surface-variant'}`}>{text}</button>
          ))}
        </div>
        <span className="ml-auto text-sm text-on-surface-variant"><strong className="text-on-surface">{visible.length}</strong> khách sạn</span>
      </div>

      {error && <p role="alert" className="mb-4 rounded-2xl bg-error-container p-4 text-sm text-on-error-container">{error}</p>}

      {loading ? <p role="status" className="p-10 text-center text-sm text-on-surface-variant">Đang tải…</p>
        : !visible.length ? <p className="rounded-2xl bg-surface-container-low p-10 text-center text-sm text-on-surface-variant">Không có khách sạn phù hợp.</p>
        : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map(h => (
              <article key={h.hotelId} className={`flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ${h.isActive ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-on-surface">{h.hotelName}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-[16px] text-primary">location_on</span><span className="truncate">{h.address}, {h.city}</span></p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${h.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant'}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />{h.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div><dt className="text-xs text-on-surface-variant">Điện thoại</dt><dd className="text-on-surface">{h.phone}</dd></div>
                  <div><dt className="text-xs text-on-surface-variant">Email</dt><dd className="truncate text-on-surface" title={h.email}>{h.email}</dd></div>
                  <div><dt className="text-xs text-on-surface-variant">Nhận phòng</dt><dd className="text-on-surface">{hhmm(h.checkInTime)}</dd></div>
                  <div><dt className="text-xs text-on-surface-variant">Trả phòng</dt><dd className="text-on-surface">{hhmm(h.checkOutTime)}</dd></div>
                </dl>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-outline-variant/30 pt-3">
                  {canManage && (
                    <button type="button" onClick={() => void openEditor(h)} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3.5 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container">
                      <span className="material-symbols-outlined text-[17px]">edit</span>Sửa
                    </button>
                  )}
                  {onNavigate && ([['inventory', 'apartment', 'Phân khu & phòng'], ['content', 'photo_library', 'Tiện ích & ảnh'], ['pricing', 'price_change', 'Giá phòng']] as const).map(([page, icon, text]) => (
                    <button key={page} type="button" onClick={() => onNavigate(page)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container">
                      <span className="material-symbols-outlined text-[17px]">{icon}</span>{text}
                    </button>
                  ))}
                  {canManage && (
                    <span className="ml-auto flex items-center gap-2 text-xs text-on-surface-variant">
                      Hoạt động<Toggle checked={h.isActive} label={`Trạng thái ${h.hotelName}`} onChange={() => { setToggleError(''); setConfirmToggle(h); }} />
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

      {/* Thêm / sửa */}
      <Modal title={editing === 'new' ? 'Thêm khách sạn' : 'Sửa khách sạn'} open={editing !== null} onClose={() => { if (!saving) setEditing(null); }}
        footer={<>
          <button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
          <button type="submit" form="hotel-form" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-60">{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </>}>
        <form id="hotel-form" onSubmit={e => void save(e)} className="grid gap-4 sm:grid-cols-2">
          {formError && <p role="alert" className="sm:col-span-2 rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{formError}</p>}
          <label className={`${label} sm:col-span-2`}>Tên khách sạn *<input required maxLength={200} value={form.hotelName} onChange={set('hotelName')} className={field} /></label>
          <label className={`${label} sm:col-span-2`}>Địa chỉ *<input required maxLength={300} value={form.address} onChange={set('address')} placeholder="Số nhà, đường, phường/quận" className={field} /></label>
          <label className={label}>Thành phố *<input required maxLength={100} value={form.city} onChange={set('city')} className={field} /></label>
          <label className={label}>Quốc gia *<input required maxLength={100} value={form.country} onChange={set('country')} className={field} /></label>
          <label className={label}>Điện thoại *<input required maxLength={20} type="tel" value={form.phone} onChange={set('phone')} className={field} /></label>
          <label className={label}>Email *<input required maxLength={255} type="email" value={form.email} onChange={set('email')} className={field} /></label>
          <label className={`${label} sm:col-span-2`}>Website<input maxLength={500} type="url" value={form.website ?? ''} onChange={set('website')} placeholder="https://…" className={field} /></label>
          <label className={label}>Giờ nhận phòng *<input required type="time" value={hhmm(form.checkInTime)} onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} className={field} /></label>
          <label className={label}>Giờ trả phòng *<input required type="time" value={hhmm(form.checkOutTime)} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} className={field} /></label>
          <label className={`${label} sm:col-span-2`}>Mô tả
            <textarea rows={3} value={form.description ?? ''} onChange={set('description')} className="mt-1 w-full rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3 text-sm font-normal outline-none focus:border-primary" />
          </label>
          <label className={`${label} sm:col-span-2`}>Chính sách hủy hiển thị cho khách
            <textarea rows={3} maxLength={2000} value={policy} onChange={e => setPolicy(e.target.value)} placeholder="VD: Hủy trước 7 ngày hoàn 100%, trước 3 ngày hoàn 50%…"
              className="mt-1 w-full rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3 text-sm font-normal outline-none focus:border-primary" />
            <span className="mt-1 block text-xs font-normal text-on-surface-variant">Mức hoàn tiền thực tế tính theo các mốc trong Voucher & Hủy hoàn; đoạn này chỉ là mô tả cho khách.</span>
          </label>
        </form>
      </Modal>

      {/* Xác nhận ngừng / kích hoạt */}
      <Modal title={confirmToggle?.isActive ? 'Ngừng hoạt động khách sạn?' : 'Kích hoạt lại khách sạn?'} open={confirmToggle !== null} onClose={() => setConfirmToggle(null)}
        footer={<>
          <button type="button" onClick={() => setConfirmToggle(null)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
          <button type="button" onClick={() => confirmToggle && void toggleActive(confirmToggle)}
            className={`rounded-full px-6 py-2.5 font-semibold ${confirmToggle?.isActive ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}`}>
            {confirmToggle?.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
          </button>
        </>}>
        {toggleError && <p role="alert" className="mb-3 rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{toggleError}</p>}
        <p className="text-sm text-on-surface">
          {confirmToggle?.isActive
            ? <>Khách sạn <b>{confirmToggle.hotelName}</b> sẽ bị ẩn khỏi tìm kiếm và không nhận đơn mới. Hệ thống chỉ cho ngừng khi <b>không còn đơn chưa hoàn tất</b> (chờ xác nhận, đã xác nhận, đang lưu trú).</>
            : <>Khách sạn <b>{confirmToggle?.hotelName}</b> sẽ hiển thị lại cho khách và nhận đặt phòng.</>}
        </p>
      </Modal>

      <Toast message={toast} />
    </>
  );
};
export default AdminHotels;
