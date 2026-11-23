import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { HotelAreaDto, HotelAreaInput, HotelAreaType, roomApi, RoomDto, RoomStatus, RoomTypeDto, RoomTypeInput } from '../../../services/roomApi';
import { formatCurrency } from '../data/adminData';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';
import { getHotelsList } from '../../../services/pricingAdminApi';

type Tab = 'types' | 'rooms';

const roomStatusStyle: Record<RoomStatus, string> = {
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Occupied: 'bg-primary-fixed/50 text-primary ring-primary/20',
  Maintenance: 'bg-secondary-fixed/60 text-on-secondary-container ring-secondary/20',
  Inactive: 'bg-surface-container-high text-outline ring-outline/20',
};

/** Nút icon nhỏ có chú thích — thay cho hàng loạt nút chữ "Sửa / Vô hiệu hóa / Kích hoạt". */
const IconAction: React.FC<{ icon: string; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }> = ({ icon, label, onClick, disabled, danger }) => (
  <button type="button" title={label} aria-label={label} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${danger ? 'text-error hover:bg-error-container' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
    <span className="material-symbols-outlined text-[18px]">{icon}</span>
  </button>
);

type AreaEditor = { area?: HotelAreaDto; type: HotelAreaType; parentAreaId?: number } | null;
type RoomEditor = RoomDto | 'new' | null;

const roomStatusLabel: Record<RoomStatus, string> = {
  Available: 'Sẵn sàng', Occupied: 'Đang có khách', Maintenance: 'Bảo trì', Inactive: 'Vô hiệu hóa',
};

const toAreaInput = (area: HotelAreaDto, isActive = area.isActive): HotelAreaInput => ({
  areaName: area.areaName, areaType: area.areaType, parentAreaId: area.parentAreaId,
  description: area.description, locationDescription: area.locationDescription,
  floorCount: area.floorCount, isActive,
});

export const AdminInventory: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageAreas = hasPermission(PERMISSIONS.areaManage);
  const canManageRooms = hasPermission(PERMISSIONS.roomManage);
  const [hotelId, setHotelId] = useState(1);
  const [hotels, setHotels] = useState<{ hotelId: number; hotelName: string }[]>([]);
  const [tab, setTab] = useState<Tab>('types');
  const [showInactive, setShowInactive] = useState(false);

  // Chọn khách sạn bằng danh sách thay vì gõ mã số.
  useEffect(() => {
    void getHotelsList().then((res) => {
      if (!res.success || !res.data) return;
      setHotels(res.data.items);
      if (res.data.items.length && !res.data.items.some((h) => h.hotelId === hotelId)) setHotelId(res.data.items[0].hotelId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [areas, setAreas] = useState<HotelAreaDto[]>([]);
  const [selectedArea, setSelectedArea] = useState(0);
  const [types, setTypes] = useState<RoomTypeDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [search, setSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState(0);
  const [roomStatusFilter, setRoomStatusFilter] = useState<'all' | RoomStatus>('all');
  const [editing, setEditing] = useState<RoomTypeDto | 'new' | null>(null);
  const [roomEditor, setRoomEditor] = useState<RoomEditor>(null);
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
    setLoading(true); setError(''); setEditing(null); setRoomEditor(null); setAreaEditor(null);
    Promise.all([roomApi.areas(hotelId, true), roomApi.types(hotelId), roomApi.rooms(hotelId)]).then(([areaData, typeData, roomData]) => {
      if (!active) return;
      setAreas(areaData); setTypes(typeData); setRooms(roomData);
      setSelectedArea(current => areaData.some(area => area.areaId === current && area.isActive)
        ? current : areaData.find(area => area.isActive && area.areaType === 'Building')?.areaId
          ?? areaData.find(area => area.isActive)?.areaId ?? 0);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được kho phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hotelId, revision]);

  const zones = useMemo(() => areas.filter(area => area.areaType === 'Zone'), [areas]);
  const activeZones = useMemo(() => zones.filter(area => area.isActive), [zones]);
  const activeBuildings = useMemo(() => areas.filter(area => area.isActive && area.areaType === 'Building'), [areas]);
  const filtered = types.filter(type => type.areaId === selectedArea && type.name.toLowerCase().includes(search.toLowerCase()));
  const selectedAreaTypes = types.filter(type => type.areaId === selectedArea);
  const activeSelectedAreaTypes = selectedAreaTypes.filter(type => type.isActive);
  const filteredRooms = rooms.filter(room => room.areaId === selectedArea
    && (!roomTypeFilter || room.roomTypeId === roomTypeFilter)
    && (roomStatusFilter === 'all' || room.status === roomStatusFilter)
    && room.roomNumber.toLowerCase().includes(roomSearch.trim().toLowerCase()));
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

  const saveRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomEditor || saving || !selectedArea) return;
    const data = new FormData(event.currentTarget);
    const input = {
      roomTypeId: Number(data.get('roomTypeId')),
      roomNumber: String(data.get('roomNumber')).trim(),
      floor: Number(data.get('floor')),
      status: String(data.get('status')) as RoomStatus,
      description: String(data.get('description')).trim() || null,
    };
    setSaving(true); setModalError('');
    try {
      if (roomEditor === 'new') await roomApi.createRoom(hotelId, selectedArea, input);
      else await roomApi.updateRoom(hotelId, roomEditor.roomId, input);
      setRoomEditor(null); setRevision(value => value + 1);
      notify(roomEditor === 'new' ? 'Đã thêm phòng vật lý.' : 'Đã cập nhật phòng.');
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Không lưu được phòng.'); }
    finally { setSaving(false); }
  };

  const changeRoomActive = async (room: RoomDto) => {
    if (saving) return;
    if (room.isActive && !window.confirm(`Vô hiệu hóa phòng ${room.roomNumber}?`)) return;
    setSaving(true); setError('');
    try {
      if (room.isActive) await roomApi.deleteRoom(hotelId, room.roomId);
      else await roomApi.updateRoom(hotelId, room.roomId, {
        roomTypeId: room.roomTypeId, roomNumber: room.roomNumber, floor: room.floor,
        status: 'Available', description: room.description,
      });
      setRevision(value => value + 1);
      notify(room.isActive ? 'Đã vô hiệu hóa phòng.' : 'Đã kích hoạt lại phòng.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được trạng thái phòng.'); }
    finally { setSaving(false); }
  };

  const selected = areas.find(area => area.areaId === selectedArea);
  const selectedIsBuilding = Boolean(selected?.isActive && selected.areaType === 'Building');
  const parentZone = selected?.parentAreaId ? areas.find(area => area.areaId === selected.parentAreaId) : undefined;
  const visibleZones = zones.filter(zone => showInactive || zone.isActive);
  const orphanBuildings = areas.filter(area => area.areaType === 'Building' && (showInactive || area.isActive)
    && !zones.some(zone => zone.areaId === area.parentAreaId && (showInactive || zone.isActive)));
  const roomsByFloor = filteredRooms.slice().sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber))
    .reduce<Record<number, RoomDto[]>>((acc, room) => { (acc[room.floor] ||= []).push(room); return acc; }, {});
  const areaRooms = rooms.filter(room => room.areaId === selectedArea);
  const stats = [
    { icon: 'location_city', label: 'Zone', value: activeZones.length },
    { icon: 'apartment', label: 'Building', value: activeBuildings.length },
    { icon: 'bed', label: 'Hạng phòng', value: types.filter(t => t.isActive).length },
    { icon: 'door_front', label: 'Phòng', value: rooms.filter(r => r.isActive).length },
  ];

  const selectArea = (areaId: number) => {
    setSelectedArea(areaId); setSearch(''); setRoomSearch(''); setRoomTypeFilter(0); setRoomStatusFilter('all');
  };

  const hotelName = hotels.find(h => h.hotelId === hotelId)?.hotelName ?? `Khách sạn #${hotelId}`;

  /**
   * Một dòng phân khu trong cây. Cấp hiển thị đúng mô hình dữ liệu:
   * Khách sạn (gốc) → Zone (cấp 1) → Building (cấp 2) → hạng phòng / phòng (cột phải).
   */
  const areaRow = (area: HotelAreaDto, depth: 1 | 2) => {
    const active = area.areaId === selectedArea;
    return (
      <div key={area.areaId} role="button" tabIndex={0} onClick={() => selectArea(area.areaId)}
        onKeyDown={(e) => { if (e.key === 'Enter') selectArea(area.areaId); }}
        className={`group relative flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 transition-colors ${depth === 2 ? 'ml-9' : 'ml-4'} ${
          active ? 'bg-primary-container text-on-primary' : 'hover:bg-surface-container'} ${area.isActive ? '' : 'opacity-55'}`}>
        <span className={`material-symbols-outlined text-[20px] ${active ? '' : 'text-primary'}`}>{area.areaType === 'Zone' ? 'location_city' : 'apartment'}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <span className={`shrink-0 rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide ${
              active ? 'bg-on-primary/20' : area.areaType === 'Zone' ? 'bg-primary-fixed/60 text-primary' : 'bg-secondary-fixed/70 text-on-secondary-container'}`}>
              {area.areaType}
            </span>
            <span className="truncate">{area.areaName}</span>
          </p>
          <p className={`truncate text-xs ${active ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
            {area.isActive ? `${area.roomTypeCount} hạng · ${area.roomCount} phòng` : 'Đã vô hiệu hóa'}
          </p>
        </div>
        {canManageAreas && (
          <div className={`flex shrink-0 items-center ${active ? '[&_button]:text-on-primary [&_button:hover]:bg-on-primary/15' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'}`}>
            {area.areaType === 'Zone' && area.isActive && <IconAction icon="add" label="Thêm Building" disabled={saving} onClick={() => openAreaEditor('Building', undefined, area.areaId)} />}
            <IconAction icon="edit" label="Sửa phân khu" disabled={saving} onClick={() => openAreaEditor(area.areaType, area)} />
            <IconAction icon={area.isActive ? 'block' : 'restart_alt'} label={area.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'} disabled={saving} onClick={() => void changeAreaStatus(area)} />
          </div>
        )}
      </div>
    );
  };

  return <>
    <PageHeading title="Phân khu & hạng phòng" description="Chọn một phân khu bên trái để quản lý hạng phòng và phòng vật lý của phân khu đó." actions={
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 rounded-full bg-surface-container-low py-1 pl-4 pr-1 text-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">hotel</span>
          <select aria-label="Khách sạn" disabled={saving} value={hotelId} onChange={event => { setHotelId(Number(event.target.value)); setSelectedArea(0); }}
            className="max-w-[240px] rounded-full bg-transparent py-1.5 pr-2 font-semibold outline-none">
            {!hotels.length && <option value={hotelId}>Khách sạn #{hotelId}</option>}
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        </label>
        <IconAction icon="refresh" label="Làm mới" disabled={loading || saving} onClick={() => setRevision(value => value + 1)} />
      </div>
    } />

    {error && <p role="alert" className="mb-5 flex items-center justify-between gap-3 rounded bg-error-container p-4 text-on-error-container">{error}<button onClick={() => setError('')} className="font-semibold">Đóng</button></p>}

    {/* Chỉ số tổng */}
    <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-3 rounded bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed/50 text-primary"><span className="material-symbols-outlined text-[20px]">{s.icon}</span></span>
          <div><p className="text-2xl font-semibold leading-none">{loading ? '–' : s.value}</p><p className="mt-1 text-xs text-on-surface-variant">{s.label} đang hoạt động</p></div>
        </div>
      ))}
    </section>

    <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ===== Cột trái: cây phân khu ===== */}
      <aside className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm lg:sticky lg:top-20">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold">Cấu trúc phân khu</h2>
          {canManageAreas && <button disabled={loading || saving} onClick={() => openAreaEditor('Zone')}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-40">
            <span className="material-symbols-outlined text-[16px]">add</span>Zone</button>}
        </div>
        {loading ? <p role="status" className="px-3 py-6 text-sm text-on-surface-variant">Đang tải phân khu…</p>
          : !areas.length ? <div className="rounded border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">Khách sạn chưa có phân khu.<br />Bấm “+ Zone” để bắt đầu.</div>
          : <div className="max-h-[calc(100vh-320px)] space-y-1 overflow-y-auto pr-1">
            {/* Gốc của cây: khách sạn đang chọn */}
            <div className="flex items-center gap-3 rounded bg-surface-container-low px-3 py-2.5">
              <span className="material-symbols-outlined text-[20px] text-primary">hotel</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-outline">Khách sạn</p>
                <p className="truncate text-sm font-semibold">{hotelName}</p>
              </div>
            </div>
            {visibleZones.map(zone => (
              <div key={zone.areaId} className="space-y-1">
                {areaRow(zone, 1)}
                {areas.filter(a => a.parentAreaId === zone.areaId && (showInactive || a.isActive)).map(b => areaRow(b, 2))}
              </div>
            ))}
            {orphanBuildings.length > 0 && <>
              <p className="ml-4 px-3 pt-3 text-xs font-semibold uppercase text-outline">Building chưa thuộc Zone</p>
              {orphanBuildings.map(b => areaRow(b, 2))}
            </>}
          </div>}
        <p className="mt-3 px-1 text-[11px] leading-5 text-on-surface-variant">
          Cấu trúc: <b>Khách sạn</b> → <b>Zone</b> → <b>Building</b> → hạng phòng &amp; phòng.
        </p>
        <label className="mt-3 flex items-center gap-2 border-t border-outline-variant/40 px-1 pt-3 text-xs text-on-surface-variant">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-primary" />
          Hiện cả phân khu đã vô hiệu hóa
        </label>
      </aside>

      {/* ===== Cột phải: chi tiết phân khu ===== */}
      <section className="min-w-0 rounded-2xl bg-surface-container-lowest shadow-sm">
        {!selected ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="material-symbols-outlined text-5xl text-outline-variant">touch_app</span>
            <p className="mt-3 font-semibold">Chọn một phân khu</p>
            <p className="mt-1 text-sm text-on-surface-variant">Danh sách hạng phòng và phòng vật lý sẽ hiển thị tại đây.</p>
          </div>
        ) : <>
          <header className="border-b border-outline-variant/40 p-5 md:p-6">
            {/* Đường dẫn đầy đủ: Khách sạn › Zone › Building */}
            <nav aria-label="Vị trí phân khu" className="flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-primary">hotel</span>
              <span>{hotelName}</span>
              {parentZone && <>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span>Zone: {parentZone.areaName}</span>
              </>}
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-semibold uppercase tracking-wider text-primary">{selected.areaType}</span>
            </nav>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-headline-sm text-2xl font-semibold">{selected.areaName}</h2>
              {canManageAreas && <button disabled={saving} onClick={() => openAreaEditor(selected.areaType, selected)}
                className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1.5 text-sm hover:bg-surface-container">
                <span className="material-symbols-outlined text-[16px]">edit</span>Sửa phân khu</button>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {!selected.isActive && <span className="rounded-full bg-error-container px-3 py-1 font-semibold text-on-error-container">Đã vô hiệu hóa</span>}
              {selected.floorCount && <span className="rounded-full bg-surface-container px-3 py-1">{selected.floorCount} tầng</span>}
              {selected.locationDescription && <span className="rounded-full bg-surface-container px-3 py-1">{selected.locationDescription}</span>}
              <span className="rounded-full bg-surface-container px-3 py-1">{selected.assignedStaffCount} nhân viên phụ trách</span>
            </div>
          </header>

          {/* Tabs */}
          <nav className="flex gap-1 border-b border-outline-variant/40 px-5 md:px-6" aria-label="Nội dung phân khu">
            {([['types', 'bed', 'Hạng phòng', selectedAreaTypes.length], ['rooms', 'door_front', 'Phòng', areaRooms.length]] as const).map(([id, icon, label, count]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
                <span className={`rounded-full px-2 text-xs ${tab === id ? 'bg-primary-fixed/60' : 'bg-surface-container-high'}`}>{count}</span>
              </button>
            ))}
          </nav>

          <div className="p-5 md:p-6">
            {tab === 'types' ? <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[200px] flex-1">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
                  <input aria-label="Tìm hạng phòng" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm hạng phòng…"
                    className="w-full rounded-full bg-surface-container-low py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                {canManageRooms && <button disabled={loading || saving || !selected.isActive} onClick={() => { setEditing('new'); setModalError(''); }}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">add</span>Thêm hạng phòng</button>}
              </div>
              {loading ? <p role="status" className="text-sm text-on-surface-variant">Đang tải…</p>
                : !filtered.length ? <p className="rounded bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">{search ? 'Không có hạng phòng khớp từ khóa.' : 'Phân khu này chưa có hạng phòng.'}</p>
                : <div className="grid gap-3 xl:grid-cols-2">
                  {filtered.map(type => {
                    const count = rooms.filter(r => r.roomTypeId === type.roomTypeId && r.isActive).length;
                    return (
                      <article key={type.roomTypeId} className={`flex flex-col rounded border border-outline-variant/40 p-4 ${type.isActive ? '' : 'opacity-60'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{type.name}</h3>
                            <p className="mt-0.5 text-xs text-on-surface-variant">{type.capacity} khách · {type.numberOfBeds} giường · {count} phòng</p>
                          </div>
                          <Toggle checked={type.isActive} disabled={saving || !canManageRooms} label={`Mở bán ${type.name}`} onChange={() => void mutateRoomType(type)} />
                        </div>
                        {type.description && <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{type.description}</p>}
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <p><strong className="text-lg text-primary">{formatCurrency(type.basePrice)}</strong><span className="text-xs text-on-surface-variant"> / đêm</span></p>
                          {canManageRooms && <div className="flex">
                            <IconAction icon="edit" label="Sửa hạng phòng" disabled={saving || !type.isActive} onClick={() => { setEditing(type); setModalError(''); }} />
                            <IconAction icon="delete" label="Vô hiệu hóa hạng phòng" danger disabled={saving || !type.isActive} onClick={() => void mutateRoomType(type, true)} />
                          </div>}
                        </div>
                      </article>
                    );
                  })}
                </div>}
            </> : <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[160px] flex-1">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
                  <input aria-label="Tìm số phòng" value={roomSearch} onChange={event => setRoomSearch(event.target.value)} placeholder="Số phòng…"
                    className="w-full rounded-full bg-surface-container-low py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                <select aria-label="Lọc hạng phòng" value={roomTypeFilter} onChange={event => setRoomTypeFilter(Number(event.target.value))} className="rounded-full bg-surface-container-low px-4 py-2.5 text-sm">
                  <option value={0}>Mọi hạng phòng</option>
                  {selectedAreaTypes.map(type => <option key={type.roomTypeId} value={type.roomTypeId}>{type.name}{type.isActive ? '' : ' (đã tắt)'}</option>)}
                </select>
                <select aria-label="Lọc trạng thái phòng" value={roomStatusFilter} onChange={event => setRoomStatusFilter(event.target.value as 'all' | RoomStatus)} className="rounded-full bg-surface-container-low px-4 py-2.5 text-sm">
                  <option value="all">Mọi trạng thái</option>
                  {(Object.keys(roomStatusLabel) as RoomStatus[]).map(status => <option key={status} value={status}>{roomStatusLabel[status]}</option>)}
                </select>
                {canManageRooms && <button disabled={loading || saving || !selectedIsBuilding || !activeSelectedAreaTypes.length} onClick={() => { setRoomEditor('new'); setModalError(''); }}
                  title={!selectedIsBuilding ? 'Phòng vật lý chỉ thêm được trong Building' : !activeSelectedAreaTypes.length ? 'Cần tạo hạng phòng trước' : undefined}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">add</span>Thêm phòng</button>}
              </div>
              {!selectedIsBuilding && !areaRooms.length ? <p className="rounded bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">Phòng vật lý được quản lý trong từng Building. Hãy chọn một Building ở cột bên trái.</p>
                : loading ? <p role="status" className="text-sm text-on-surface-variant">Đang tải…</p>
                : !filteredRooms.length ? <p className="rounded bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">Không có phòng phù hợp.</p>
                : <div className="space-y-5">
                  {Object.entries(roomsByFloor).map(([floor, list]) => (
                    <div key={floor}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-outline">Tầng {floor} · {list.length} phòng</p>
                      <div className="divide-y divide-outline-variant/30 overflow-hidden rounded border border-outline-variant/40">
                        {list.map(room => {
                          const type = types.find(item => item.roomTypeId === room.roomTypeId);
                          const status: RoomStatus = room.isActive ? room.status : 'Inactive';
                          return (
                            <div key={room.roomId} className={`flex items-center gap-4 px-4 py-3 ${room.isActive ? '' : 'opacity-60'}`}>
                              <span className="flex h-10 min-w-[52px] items-center justify-center rounded bg-surface-container px-2 text-sm font-bold">{room.roomNumber}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{type?.name || `Hạng #${room.roomTypeId}`}</p>
                                {room.description && <p className="truncate text-xs text-on-surface-variant">{room.description}</p>}
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roomStatusStyle[status]}`}>{roomStatusLabel[status]}</span>
                              {canManageRooms && <div className="flex">
                                <IconAction icon="edit" label="Sửa phòng" disabled={saving} onClick={() => { setRoomEditor(room); setModalError(''); }} />
                                <IconAction icon={room.isActive ? 'block' : 'restart_alt'} label={room.isActive ? 'Vô hiệu hóa phòng' : 'Kích hoạt lại'} danger={room.isActive} disabled={saving} onClick={() => void changeRoomActive(room)} />
                              </div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>}
            </>}
          </div>
        </>}
      </section>
    </div>

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
    <Modal title={roomEditor === 'new' ? 'Thêm phòng vật lý' : 'Cập nhật phòng'} open={Boolean(roomEditor)} onClose={() => { if (!saving) setRoomEditor(null); }}>
      {roomEditor && <form key={roomEditor === 'new' ? 'new-room' : roomEditor.roomId} onSubmit={saveRoom} className="grid gap-4 sm:grid-cols-2">
        {modalError && <p role="alert" className="col-span-full text-error">{modalError}</p>}
        <label>Số phòng<input name="roomNumber" required maxLength={20} pattern="[ -~]+" defaultValue={roomEditor === 'new' ? '' : roomEditor.roomNumber} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Tầng<input name="floor" type="number" required min="0" step="1" defaultValue={roomEditor === 'new' ? 1 : roomEditor.floor} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label>Hạng phòng<select name="roomTypeId" required defaultValue={roomEditor === 'new' ? activeSelectedAreaTypes[0]?.roomTypeId ?? '' : roomEditor.roomTypeId} className="mt-1 w-full rounded-lg bg-surface-container-low p-3"><option value="">Chọn hạng phòng</option>{activeSelectedAreaTypes.map(type => <option key={type.roomTypeId} value={type.roomTypeId}>{type.name}</option>)}</select></label>
        <label>Trạng thái<select name="status" defaultValue={roomEditor === 'new' ? 'Available' : roomEditor.status} className="mt-1 w-full rounded-lg bg-surface-container-low p-3">{(Object.keys(roomStatusLabel) as RoomStatus[]).map(status => <option key={status} value={status}>{roomStatusLabel[status]}</option>)}</select></label>
        <label className="col-span-full">Mô tả<textarea name="description" maxLength={500} defaultValue={roomEditor === 'new' ? '' : roomEditor.description ?? ''} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <button disabled={saving || !activeSelectedAreaTypes.length} className="col-span-full rounded-full bg-primary p-3 text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu phòng'}</button>
      </form>}
    </Modal>
    <Toast message={toast} />
  </>;
};
