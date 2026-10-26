import React, { FormEvent, useEffect, useState } from 'react';
import { roomApi, RoomTypeDto, HotelAreaDto, RoomTypeInput } from '../../../services/roomApi';
import { formatCurrency } from '../data/adminData';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';

export const AdminInventory: React.FC = () => {
  const [hotelId, setHotelId] = useState(1);
  const [areas, setAreas] = useState<HotelAreaDto[]>([]);
  const [selectedArea, setSelectedArea] = useState(0);
  const [types, setTypes] = useState<RoomTypeDto[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RoomTypeDto | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setAreas([]); setTypes([]); setSelectedArea(0); setEditing(null);
    Promise.all([roomApi.areas(hotelId), roomApi.types(hotelId)]).then(([a, t]) => {
      if (active) { setAreas(a); setTypes(t); setSelectedArea(a[0]?.areaId || 0); }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được kho phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hotelId, revision]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing || saving) return;
    const data = new FormData(event.currentTarget);
    const input: RoomTypeInput = { name: String(data.get('name')).trim(), description: String(data.get('description')).trim() || null,
      basePrice: Number(data.get('price')), capacity: Number(data.get('capacity')), numberOfBeds: Number(data.get('beds')) };
    setSaving(true); setModalError('');
    try {
      const updated = editing === 'new' ? await roomApi.createType(hotelId, selectedArea, input) : await roomApi.updateType(hotelId, editing.roomTypeId, input);
      setTypes(current => editing === 'new' ? [...current, updated] : current.map(t => t.roomTypeId === updated.roomTypeId ? updated : t));
      setEditing(null); notify('Đã lưu loại phòng.');
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Không lưu được loại phòng.'); }
    finally { setSaving(false); }
  };
  const mutate = async (type: RoomTypeDto, remove = false) => {
    if (saving) return;
    if (remove && !window.confirm(`Vô hiệu hóa loại phòng ${type.name}?`)) return;
    setSaving(true); setError('');
    try {
      if (remove) { await roomApi.deleteType(hotelId, type.roomTypeId); setTypes(current => current.map(t => t.roomTypeId === type.roomTypeId ? { ...t, isActive: false } : t)); }
      else { const updated = await roomApi.typeStatus(hotelId, type.roomTypeId, !type.isActive); setTypes(current => current.map(t => t.roomTypeId === updated.roomTypeId ? updated : t)); }
      notify('Đã cập nhật trạng thái loại phòng.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được loại phòng.'); }
    finally { setSaving(false); }
  };
  const filtered = types.filter(t => t.areaId === selectedArea && t.name.toLowerCase().includes(search.toLowerCase()));
  const current = editing && editing !== 'new' ? editing : null;
  return <>
    <PageHeading title="Kho phòng & Loại phòng" description="Quản lý loại phòng, giá, sức chứa theo khách sạn và khu vực." actions={<button disabled={loading || saving || !selectedArea} onClick={() => { setEditing('new'); setModalError(''); }} className="rounded-full bg-primary px-5 py-2 text-on-primary disabled:opacity-40">Thêm loại phòng</button>} />
    <form onSubmit={e => { e.preventDefault(); const id = Number(new FormData(e.currentTarget).get('hotel')); if (id > 0 && Number.isSafeInteger(id)) setHotelId(id); }} className="mb-5 flex flex-wrap gap-3">
      <label>Mã khách sạn <input disabled={saving} key={hotelId} name="hotel" type="number" min="1" step="1" required defaultValue={hotelId} className="rounded-lg bg-surface-container-low p-2" /></label><button disabled={saving} className="rounded-full bg-primary px-4 py-2 text-on-primary">Xem</button>
      <button disabled={loading || saving} type="button" onClick={() => setRevision(r => r + 1)} className="rounded-full bg-surface-container px-4">Làm mới</button>
    </form>
    {error && <p role="alert" className="mb-5 rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap gap-3"><select aria-label="Khu vực" disabled={loading || saving} value={selectedArea} onChange={e => setSelectedArea(Number(e.target.value))} className="rounded-lg bg-surface-container-low p-3"><option value={0}>Chọn khu vực</option>{areas.map(a => <option key={a.areaId} value={a.areaId}>{a.areaName}</option>)}</select><input aria-label="Tìm loại phòng" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm loại phòng…" className="rounded-full bg-surface-container-low px-4" /></div>
      {loading ? <p role="status">Đang tải kho phòng…</p> : !filtered.length ? <p>Chưa có loại phòng phù hợp trong khu vực này.</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(t => <article key={t.roomTypeId} className="rounded-lg border border-outline-variant/30 p-5"><h3 className="text-xl font-semibold">{t.name}</h3><p className="text-sm text-outline">#{t.roomTypeId} · {t.capacity} khách · {t.numberOfBeds} giường</p><p className="my-3">{t.description}</p><strong className="text-primary">{formatCurrency(t.basePrice)} / đêm</strong><div className="mt-5 flex items-center justify-between gap-2"><Toggle checked={t.isActive} disabled={saving} label={`Hoạt động ${t.name}`} onChange={() => void mutate(t)} /><span>{t.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}</span><button disabled={saving || !t.isActive} onClick={() => { setEditing(t); setModalError(''); }} className="rounded-full bg-surface-container px-3 py-2">Sửa</button><button disabled={saving || !t.isActive} onClick={() => void mutate(t, true)} className="rounded-full bg-error-container px-3 py-2 text-on-error-container">Xóa</button></div></article>)}</div>}
    </section>
    <Modal title={editing === 'new' ? 'Thêm loại phòng' : 'Cập nhật loại phòng'} open={Boolean(editing)} onClose={() => { if (!saving) setEditing(null); }}>
      {editing && <form key={editing === 'new' ? 'new' : editing.roomTypeId} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {modalError && <p role="alert" className="col-span-full text-error">{modalError}</p>}
        <label className="col-span-full">Tên loại phòng<input name="name" required maxLength={100} defaultValue={current?.name} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Giá / đêm<input name="price" type="number" required min="0" step="0.01" defaultValue={current?.basePrice ?? 0} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Sức chứa<input name="capacity" type="number" required min="1" step="1" defaultValue={current?.capacity ?? 2} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Số giường<input name="beds" type="number" required min="1" step="1" defaultValue={current?.numberOfBeds ?? 1} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label className="col-span-full">Mô tả<textarea name="description" defaultValue={current?.description ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <button disabled={saving} className="col-span-full rounded-full bg-primary p-3 text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu loại phòng'}</button>
      </form>}
    </Modal><Toast message={toast} />
  </>;
};
