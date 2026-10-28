import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { HotelAreaDto, HotelAreaInput, HotelAreaType, roomApi, RoomTypeDto, RoomTypeInput } from '../../../services/roomApi';
import { formatCurrency } from '../data/adminData';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';

type AreaEditor = { area?: HotelAreaDto; type: HotelAreaType; parentAreaId?: number } | null;

const toAreaInput = (area: HotelAreaDto, isActive = area.isActive): HotelAreaInput => ({
  areaName: area.areaName, areaType: area.areaType, parentAreaId: area.parentAreaId,
  description: area.description, locationDescription: area.locationDescription,
  floorCount: area.floorCount, isActive,
});

export const AdminInventory: React.FC = () => {
  const [hotelId, setHotelId] = useState(1);
  const [areas, setAreas] = useState<HotelAreaDto[]>([]);
  const [selectedArea, setSelectedArea] = useState(0);
  const [types, setTypes] = useState<RoomTypeDto[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RoomTypeDto | 'new' | null>(null);
  const [areaEditor, setAreaEditor] = useState<AreaEditor>(null);
  const [editorAreaType, setEditorAreaType] = useState<HotelAreaType>('Zone');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setEditing(null); setAreaEditor(null);
    Promise.all([roomApi.areas(hotelId, true), roomApi.types(hotelId)]).then(([areaData, typeData]) => {
      if (!active) return;
      setAreas(areaData); setTypes(typeData);
      setSelectedArea(current => areaData.some(area => area.areaId === current && area.isActive)
        ? current : areaData.find(area => area.isActive)?.areaId ?? 0);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được kho phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hotelId, revision]);

  const zones = useMemo(() => areas.filter(area => area.areaType === 'Zone'), [areas]);
  const activeAreas = useMemo(() => areas.filter(area => area.isActive), [areas]);
  const activeZones = useMemo(() => zones.filter(area => area.isActive), [zones]);
  const filtered = types.filter(type => type.areaId === selectedArea && type.name.toLowerCase().includes(search.toLowerCase()));
  const current = editing && editing !== 'new' ? editing : null;

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const openAreaEditor = (type: HotelAreaType, area?: HotelAreaDto, parentAreaId?: number) => {
    setAreaEditor({ type, area, parentAreaId }); setEditorAreaType(area?.areaType ?? type); setModalError('');
  };

  const saveArea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!areaEditor || saving) return;
    const data = new FormData(event.currentTarget);
    const type = String(data.get('areaType')) as HotelAreaType;
    const parentValue = Number(data.get('parentAreaId'));
    const floorValue = Number(data.get('floorCount'));
    const input: HotelAreaInput = {
      areaName: String(data.get('areaName')).trim(), areaType: type,
      parentAreaId: type === 'Building' && parentValue > 0 ? parentValue : null,
      description: String(data.get('description')).trim() || null,
      locationDescription: String(data.get('locationDescription')).trim() || null,
      floorCount: floorValue > 0 ? floorValue : null, isActive: areaEditor.area?.isActive ?? true,
    };
    setSaving(true); setModalError('');
    try {
      const saved = areaEditor.area
        ? await roomApi.updateArea(hotelId, areaEditor.area.areaId, input)
        : await roomApi.createArea(hotelId, input);
      setAreas(items => areaEditor.area ? items.map(area => area.areaId === saved.areaId ? saved : area) : [...items, saved]);
      if (saved.isActive) setSelectedArea(value => value || saved.areaId);
      setAreaEditor(null); notify(areaEditor.area ? 'Đã cập nhật phân khu.' : 'Đã tạo phân khu mới.');
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Không lưu được phân khu.'); }
    finally { setSaving(false); }
  };

  const changeAreaStatus = async (area: HotelAreaDto) => {
    if (saving || (area.isActive && !window.confirm(`Vô hiệu hóa ${area.areaName}?`))) return;
    setSaving(true); setError('');
    try {
      if (area.isActive) {
        await roomApi.deleteArea(hotelId, area.areaId);
        setAreas(items => items.map(item => item.areaId === area.areaId ? { ...item, isActive: false } : item));
        if (selectedArea === area.areaId) setSelectedArea(areas.find(item => item.areaId !== area.areaId && item.isActive)?.areaId ?? 0);
        notify('Đã vô hiệu hóa phân khu.');
      } else {
        const updated = await roomApi.updateArea(hotelId, area.areaId, toAreaInput(area, true));
        setAreas(items => items.map(item => item.areaId === updated.areaId ? updated : item));
        setSelectedArea(value => value || updated.areaId); notify('Đã kích hoạt lại phân khu.');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được trạng thái phân khu.'); }
    finally { setSaving(false); }
  };

  const saveRoomType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing || saving) return;
    const data = new FormData(event.currentTarget);
    const input: RoomTypeInput = { name: String(data.get('name')).trim(), description: String(data.get('description')).trim() || null,
      basePrice: Number(data.get('price')), capacity: Number(data.get('capacity')), numberOfBeds: Number(data.get('beds')) };
    setSaving(true); setModalError('');
    try {
      const updated = editing === 'new' ? await roomApi.createType(hotelId, selectedArea, input) : await roomApi.updateType(hotelId, editing.roomTypeId, input);
      setTypes(items => editing === 'new' ? [...items, updated] : items.map(type => type.roomTypeId === updated.roomTypeId ? updated : type));
      setEditing(null); notify('Đã lưu loại phòng.');
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Không lưu được loại phòng.'); }
    finally { setSaving(false); }
  };

  const mutateRoomType = async (type: RoomTypeDto, remove = false) => {
    if (saving || (remove && !window.confirm(`Vô hiệu hóa loại phòng ${type.name}?`))) return;
    setSaving(true); setError('');
    try {
      if (remove) {
        await roomApi.deleteType(hotelId, type.roomTypeId);
        setTypes(items => items.map(item => item.roomTypeId === type.roomTypeId ? { ...item, isActive: false } : item));
      } else {
        const updated = await roomApi.typeStatus(hotelId, type.roomTypeId, !type.isActive);
        setTypes(items => items.map(item => item.roomTypeId === updated.roomTypeId ? updated : item));
      }
      notify('Đã cập nhật trạng thái loại phòng.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được loại phòng.'); }
    finally { setSaving(false); }
  };

  return <>
    <PageHeading title="Kho phòng & Phân khu" description="Quản lý Zone, Building và loại phòng theo đúng cấu trúc từng khách sạn." actions={<>
      <button disabled={loading || saving} onClick={() => openAreaEditor('Zone')} className="rounded-full bg-surface-container-high px-5 py-2 disabled:opacity-40">Thêm Zone</button>
      <button disabled={loading || saving || !activeZones.length} onClick={() => openAreaEditor('Building')} className="rounded-full bg-surface-container-high px-5 py-2 disabled:opacity-40">Thêm Building</button>
      <button disabled={loading || saving || !selectedArea} onClick={() => { setEditing('new'); setModalError(''); }} className="rounded-full bg-primary px-5 py-2 text-on-primary disabled:opacity-40">Thêm loại phòng</button>
    </>} />

    <form onSubmit={event => { event.preventDefault(); const id = Number(new FormData(event.currentTarget).get('hotel')); if (id > 0 && Number.isSafeInteger(id)) setHotelId(id); }} className="mb-5 flex flex-wrap gap-3">
      <label>Mã khách sạn <input disabled={saving} key={hotelId} name="hotel" type="number" min="1" step="1" required defaultValue={hotelId} className="rounded-lg bg-surface-container-low p-2" /></label>
      <button disabled={saving} className="rounded-full bg-primary px-4 py-2 text-on-primary">Xem</button>
      <button disabled={loading || saving} type="button" onClick={() => setRevision(value => value + 1)} className="rounded-full bg-surface-container px-4">Làm mới</button>
    </form>
    {error && <p role="alert" className="mb-5 rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}

    <section className="mb-6 rounded-lg bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Zone & Building</h2><p className="text-sm text-on-surface-variant">Building phải trực thuộc một Zone đang hoạt động.</p></div><span className="rounded-full bg-surface-container px-3 py-1 text-sm">{areas.length} phân khu</span></div>
      {loading ? <p role="status">Đang tải phân khu…</p> : !areas.length ? <p>Khách sạn chưa có phân khu.</p> : <div className="grid gap-4 xl:grid-cols-2">{zones.map(zone => {
        const buildings = areas.filter(area => area.parentAreaId === zone.areaId);
        return <article key={zone.areaId} className={`rounded-lg border p-5 ${zone.isActive ? 'border-outline-variant/30' : 'border-error/30 opacity-70'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Zone #{zone.areaId}</p><h3 className="text-xl font-semibold">{zone.areaName}</h3><p className="text-sm text-on-surface-variant">{zone.locationDescription || zone.description || 'Chưa có mô tả vị trí.'}</p></div><span className={`rounded-full px-3 py-1 text-xs ${zone.isActive ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>{zone.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}</span></div>
          <div className="my-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span>{buildings.length} tòa</span><span>{zone.roomTypeCount} loại phòng</span><span>{zone.roomCount} phòng</span><span>{zone.assignedStaffCount} nhân viên</span></div>
          <div className="space-y-2">{buildings.map(building => <div key={building.areaId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3"><div><strong>{building.areaName}</strong><p className="text-xs text-on-surface-variant">#{building.areaId} · {building.floorCount ? `${building.floorCount} tầng` : 'Chưa đặt số tầng'} · {building.roomCount} phòng</p></div><div className="flex gap-2"><button disabled={saving} onClick={() => openAreaEditor('Building', building)} className="rounded-full bg-surface-container px-3 py-1">Sửa</button><button disabled={saving} onClick={() => void changeAreaStatus(building)} className="rounded-full bg-surface-container px-3 py-1">{building.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</button></div></div>)}{!buildings.length && <p className="rounded-lg bg-surface-container-low p-3 text-sm">Zone này chưa có Building.</p>}</div>
          <div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} onClick={() => openAreaEditor('Zone', zone)} className="rounded-full bg-surface-container px-4 py-2">Sửa Zone</button><button disabled={saving || !zone.isActive} onClick={() => openAreaEditor('Building', undefined, zone.areaId)} className="rounded-full bg-surface-container px-4 py-2">Thêm Building</button><button disabled={saving} onClick={() => void changeAreaStatus(zone)} className="rounded-full bg-error-container px-4 py-2 text-on-error-container">{zone.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</button></div>
        </article>;
      })}</div>}
    </section>

    <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap gap-3"><select aria-label="Khu vực" disabled={loading || saving} value={selectedArea} onChange={event => setSelectedArea(Number(event.target.value))} className="rounded-lg bg-surface-container-low p-3"><option value={0}>Chọn khu vực đang hoạt động</option>{activeAreas.map(area => <option key={area.areaId} value={area.areaId}>{area.areaType === 'Building' ? '↳ ' : ''}{area.areaName}</option>)}</select><input aria-label="Tìm loại phòng" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm loại phòng…" className="rounded-full bg-surface-container-low px-4" /></div>
      {loading ? <p role="status">Đang tải kho phòng…</p> : !filtered.length ? <p>Chưa có loại phòng phù hợp trong khu vực này.</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map(type => <article key={type.roomTypeId} className="rounded-lg border border-outline-variant/30 p-5"><h3 className="text-xl font-semibold">{type.name}</h3><p className="text-sm text-outline">#{type.roomTypeId} · {type.capacity} khách · {type.numberOfBeds} giường</p><p className="my-3">{type.description}</p><strong className="text-primary">{formatCurrency(type.basePrice)} / đêm</strong><div className="mt-5 flex items-center justify-between gap-2"><Toggle checked={type.isActive} disabled={saving} label={`Hoạt động ${type.name}`} onChange={() => void mutateRoomType(type)} /><span>{type.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}</span><button disabled={saving || !type.isActive} onClick={() => { setEditing(type); setModalError(''); }} className="rounded-full bg-surface-container px-3 py-2">Sửa</button><button disabled={saving || !type.isActive} onClick={() => void mutateRoomType(type, true)} className="rounded-full bg-error-container px-3 py-2 text-on-error-container">Xóa</button></div></article>)}</div>}
    </section>

    <Modal title={areaEditor?.area ? 'Cập nhật phân khu' : `Thêm ${areaEditor?.type ?? 'phân khu'}`} open={Boolean(areaEditor)} onClose={() => { if (!saving) setAreaEditor(null); }}>
      {areaEditor && <form key={areaEditor.area?.areaId ?? areaEditor.type} onSubmit={saveArea} className="grid gap-4 sm:grid-cols-2">
        {modalError && <p role="alert" className="col-span-full text-error">{modalError}</p>}
        <label className="col-span-full">Tên phân khu<input name="areaName" required maxLength={150} defaultValue={areaEditor.area?.areaName ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Loại phân khu<select name="areaType" value={editorAreaType} onChange={event => setEditorAreaType(event.target.value as HotelAreaType)} className="mt-1 w-full rounded-lg bg-surface-container-low p-3"><option value="Zone">Zone</option><option value="Building">Building</option></select></label>
        {editorAreaType === 'Building' && <label>Zone trực thuộc<select name="parentAreaId" required defaultValue={areaEditor.area?.parentAreaId ?? areaEditor.parentAreaId ?? activeZones[0]?.areaId ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3"><option value="">Chọn Zone</option>{activeZones.filter(zone => zone.areaId !== areaEditor.area?.areaId).map(zone => <option key={zone.areaId} value={zone.areaId}>{zone.areaName}</option>)}</select></label>}
        <label>Số tầng<input name="floorCount" type="number" min="1" step="1" defaultValue={areaEditor.area?.floorCount ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Vị trí<input name="locationDescription" maxLength={500} defaultValue={areaEditor.area?.locationDescription ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label className="col-span-full">Mô tả<textarea name="description" maxLength={500} defaultValue={areaEditor.area?.description ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <button disabled={saving || (editorAreaType === 'Building' && !activeZones.length)} className="col-span-full rounded-full bg-primary p-3 text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu phân khu'}</button>
      </form>}
    </Modal>

    <Modal title={editing === 'new' ? 'Thêm loại phòng' : 'Cập nhật loại phòng'} open={Boolean(editing)} onClose={() => { if (!saving) setEditing(null); }}>
      {editing && <form key={editing === 'new' ? 'new' : editing.roomTypeId} onSubmit={saveRoomType} className="grid gap-4 sm:grid-cols-2">
        {modalError && <p role="alert" className="col-span-full text-error">{modalError}</p>}
        <label className="col-span-full">Tên loại phòng<input name="name" required maxLength={100} defaultValue={current?.name} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Giá / đêm<input name="price" type="number" required min="0" step="0.01" defaultValue={current?.basePrice ?? 0} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Sức chứa<input name="capacity" type="number" required min="1" step="1" defaultValue={current?.capacity ?? 2} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Số giường<input name="beds" type="number" required min="1" step="1" defaultValue={current?.numberOfBeds ?? 1} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label className="col-span-full">Mô tả<textarea name="description" defaultValue={current?.description ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <button disabled={saving} className="col-span-full rounded-full bg-primary p-3 text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu loại phòng'}</button>
      </form>}
    </Modal>
    <Toast message={toast} />
  </>;
};
