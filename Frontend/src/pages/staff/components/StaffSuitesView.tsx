import React, { useEffect, useMemo, useState } from 'react';
import { HotelAreaDto, RoomDto, roomApi } from '../../../services/roomApi';
import { getMyAssignedAreas, StaffAssignedArea } from '../../../services/staffAssignmentApi';
import { useAuth } from '../../../context/AuthContext';

interface StaffSuitesViewProps {
  onShowToast?: (message: string) => void;
  onNavigateToReservations?: (zoneCode?: string) => void;
}

interface AreaCluster {
  key: string;
  hotelId: number;
  hotelName: string;
  hotelAddress: string;
  areaId: number;
  name: string;
  areaType: string;
  parentAreaId?: number;
  parentName?: string;
  areaIds: number[];
  roomCount: number;
}

export const StaffSuitesView: React.FC<StaffSuitesViewProps> = () => {
  const { session } = useAuth();
  const [assignedAreas, setAssignedAreas] = useState<StaffAssignedArea[]>([]);
  const [areas, setAreas] = useState<HotelAreaDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [hotelNames, setHotelNames] = useState<Record<number, string>>({});
  const [hotelAddresses, setHotelAddresses] = useState<Record<number, string>>({});
  const [selectedClusterKey, setSelectedClusterKey] = useState('');
  const [selectedMapAreaId, setSelectedMapAreaId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getMyAssignedAreas()
      .then(async response => {
        if (!response.success) throw new Error(response.message || 'Không tải được phạm vi phụ trách.');
        const assignments = (response.data || []).filter(item => item.isActive);
        const hotelIds = [...new Set(assignments.map(item => item.hotelId))];
        const hotelData = await Promise.all(hotelIds.map(async hotelId => {
          const [hotelInfo, hotelAreas, hotelRooms] = await Promise.all([
            roomApi.hotel(hotelId), roomApi.areas(hotelId), roomApi.rooms(hotelId),
          ]);
          return { hotelId, hotelInfo, hotelAreas, hotelRooms };
        }));

        if (!active) return;
        setAssignedAreas(assignments);
        setHotelNames(Object.fromEntries(hotelData.map(item => [item.hotelId, item.hotelInfo.hotelName])));
        setHotelAddresses(Object.fromEntries(hotelData.map(item => [item.hotelId, item.hotelInfo.address])));
        setAreas(hotelData.flatMap(item => item.hotelAreas));
        setRooms(hotelData.flatMap(item => item.hotelRooms));
      })
      .catch(reason => {
        if (!active) return;
        setAssignedAreas([]); setAreas([]); setRooms([]); setHotelNames({}); setHotelAddresses({});
        setError(reason instanceof Error ? reason.message : 'Không tải được buồng phòng.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [revision, session?.accessToken]);

  const clusters = useMemo<AreaCluster[]>(() => {
    const topLevelAssignments = assignedAreas.filter(item =>
      !item.parentAreaId || !assignedAreas.some(parent =>
        parent.hotelId === item.hotelId && parent.areaId === item.parentAreaId));

    return topLevelAssignments.map(item => {
      const childAreaIds = item.areaType === 'Zone'
        ? areas.filter(area => area.hotelId === item.hotelId && area.parentAreaId === item.areaId).map(area => area.areaId)
        : [];
      const areaIds = [item.areaId, ...childAreaIds];
      return {
        key: `${item.hotelId}-${item.areaId}`,
        hotelId: item.hotelId,
        hotelName: hotelNames[item.hotelId] || `Khách sạn #${item.hotelId}`,
        hotelAddress: hotelAddresses[item.hotelId] || '',
        areaId: item.areaId,
        name: item.areaName,
        areaType: item.areaType,
        parentAreaId: item.parentAreaId,
        parentName: item.parentAreaName,
        areaIds,
        roomCount: rooms.filter(room => room.hotelId === item.hotelId && areaIds.includes(room.areaId)).length,
      };
    });
  }, [assignedAreas, areas, rooms, hotelNames, hotelAddresses]);

  useEffect(() => {
    if (!clusters.length) { setSelectedClusterKey(''); return; }
    if (!clusters.some(cluster => cluster.key === selectedClusterKey)) setSelectedClusterKey(clusters[0].key);
  }, [clusters, selectedClusterKey]);

  const selectedCluster = clusters.find(cluster => cluster.key === selectedClusterKey);
  useEffect(() => {
    if (selectedCluster && !selectedCluster.areaIds.includes(selectedMapAreaId || 0)) {
      setSelectedMapAreaId(selectedCluster.areaId);
    }
  }, [selectedCluster, selectedMapAreaId]);

  const selectedZone = selectedCluster
    ? areas.find(area => area.hotelId === selectedCluster.hotelId && area.areaId === (selectedCluster.areaType === 'Zone' ? selectedCluster.areaId : selectedCluster.parentAreaId))
    : undefined;
  const zoneBuildings = selectedCluster
    ? areas.filter(area => area.hotelId === selectedCluster.hotelId && area.areaType === 'Building' &&
      (selectedCluster.areaType === 'Zone' ? area.parentAreaId === selectedCluster.areaId && selectedCluster.areaIds.includes(area.areaId) : area.areaId === selectedCluster.areaId))
    : [];
  const selectableAreas = selectedCluster?.areaType === 'Zone'
    ? [selectedZone, ...zoneBuildings].filter((area): area is HotelAreaDto => Boolean(area))
    : zoneBuildings;
  const selectedMapArea = selectableAreas.find(area => area.areaId === selectedMapAreaId) || selectableAreas[0];
  const selectedAreaRooms = selectedCluster && selectedMapArea
    ? rooms.filter(room => room.hotelId === selectedCluster.hotelId &&
      (selectedMapArea.areaType === 'Building'
        ? room.areaId === selectedMapArea.areaId
        : selectedCluster.areaIds.includes(room.areaId)))
    : [];
  const clusterRooms = selectedMapArea?.areaType === 'Building' ? selectedAreaRooms : [];
  const areaRoomSummary = selectedMapArea ? {
    total: selectedAreaRooms.length,
    available: selectedAreaRooms.filter(room => room.status === 'Available').length,
    occupied: selectedAreaRooms.filter(room => room.status === 'Occupied').length,
    maintenance: selectedAreaRooms.filter(room => room.status === 'Maintenance').length,
  } : { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const filteredRooms = clusterRooms.filter(room =>
    room.roomNumber.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === 'all' || room.status === status));

  const STATUS_UI: Record<string, { label: string; className: string }> = {
    Available: { label: 'Sẵn sàng', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    Occupied: { label: 'Có khách', className: 'bg-primary-fixed/50 text-primary ring-primary/20' },
    Maintenance: { label: 'Bảo trì', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
    Inactive: { label: 'Ngừng hoạt động', className: 'bg-surface-container-high text-on-surface-variant ring-outline/20' },
  };
  const roomsByFloor = filteredRooms.slice().sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber))
    .reduce<Record<number, RoomDto[]>>((acc, room) => { (acc[room.floor] ||= []).push(room); return acc; }, {});
  const pickArea = (areaId: number) => { setSelectedMapAreaId(areaId); setSearch(''); setStatus('all'); setDetailsOpen(false); };

  return <section className="flex flex-col gap-6">
    {/* Đầu trang */}
    <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
      <div>
        <h1 className="font-headline-sm text-3xl font-semibold tracking-tight text-on-surface">Phân khu &amp; phòng</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Cấu trúc khu vực bạn phụ trách và tình trạng từng phòng.</p>
      </div>
      <button type="button" title="Tải lại" aria-label="Tải lại" disabled={loading} onClick={() => setRevision(value => value + 1)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-40">
        <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
      </button>
    </div>

    {error && <p role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-error-container p-4 text-on-error-container">{error}<button type="button" onClick={() => setRevision(v => v + 1)} className="font-semibold">Thử lại</button></p>}
    {loading && !clusters.length && <p role="status" className="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant shadow-sm">Đang tải phân khu được giao…</p>}
    {!loading && !clusters.length && !error && (
      <div className="rounded-2xl bg-surface-container-lowest p-10 text-center shadow-sm">
        <span className="material-symbols-outlined text-5xl text-outline-variant">apartment</span>
        <p className="mt-2 font-semibold">Bạn chưa được phân công phân khu nào</p>
        <p className="mt-1 text-sm text-on-surface-variant">Liên hệ quản trị viên để được giao khu vực phụ trách.</p>
      </div>
    )}

    {!!clusters.length && selectedCluster && (
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ===== Trái: cây khu vực ===== */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {clusters.length > 1 && (
            <label className="flex items-center gap-2 rounded-full bg-surface-container-lowest py-1 pl-4 pr-1 text-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">hotel</span>
              <select aria-label="Cụm phân khu" value={selectedClusterKey}
                onChange={e => { setSelectedClusterKey(e.target.value); setSearch(''); setStatus('all'); setDetailsOpen(false); }}
                className="min-w-0 flex-1 rounded-full bg-transparent py-1.5 pr-2 font-semibold outline-none">
                {clusters.map(c => <option key={c.key} value={c.key}>{c.hotelName} · {c.areaType === 'Zone' ? c.name : c.parentName || c.name}</option>)}
              </select>
            </label>
          )}
          <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3 rounded bg-surface-container-low px-3 py-2.5">
              <span className="material-symbols-outlined text-[20px] text-primary">hotel</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-outline">Khách sạn</p>
                <p className="truncate text-sm font-semibold">{selectedCluster.hotelName}</p>
              </div>
            </div>
            {selectedZone && (
              <button type="button" disabled={selectedCluster.areaType !== 'Zone'} onClick={() => pickArea(selectedZone.areaId)}
                className={`ml-4 flex w-[calc(100%-1rem)] items-center gap-3 rounded px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                  selectedMapArea?.areaId === selectedZone.areaId ? 'bg-primary-container text-on-primary' : 'hover:bg-surface-container'}`}>
                <span className="material-symbols-outlined text-[20px]">location_city</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Zone</span>
                  <span className="block truncate text-sm font-semibold">{selectedZone.areaName}</span>
                </span>
              </button>
            )}
            <div className="mt-1 space-y-1">
              {zoneBuildings.map(b => {
                const active = b.areaId === selectedMapArea?.areaId;
                const count = rooms.filter(r => r.hotelId === b.hotelId && r.areaId === b.areaId).length;
                return (
                  <button key={b.areaId} type="button" onClick={() => pickArea(b.areaId)}
                    className={`ml-9 flex w-[calc(100%-2.25rem)] items-center gap-3 rounded px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary-container text-on-primary' : 'hover:bg-surface-container'}`}>
                    <span className="material-symbols-outlined text-[20px]">apartment</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">Building</span>
                      <span className="block truncate text-sm font-semibold">{b.areaName}</span>
                    </span>
                    <span className={`text-xs ${active ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{count} phòng</span>
                  </button>
                );
              })}
              {!zoneBuildings.length && <p className="ml-9 px-3 py-2 text-xs text-on-surface-variant">Chưa có Building được giao.</p>}
            </div>
          </div>
        </aside>

        {/* ===== Phải: khu vực đang chọn ===== */}
        <section className="min-w-0 rounded-2xl bg-surface-container-lowest shadow-sm">
          <header className="border-b border-outline-variant/40 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{selectedMapArea?.areaType === 'Building' ? 'Building' : 'Zone'}</p>
                <h2 className="mt-0.5 text-2xl font-semibold">{selectedMapArea?.areaName || selectedCluster.name}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">{selectedMapArea?.locationDescription || selectedMapArea?.description || selectedCluster.hotelName}</p>
              </div>
              <button type="button" onClick={() => setDetailsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px]">info</span>Thông tin &amp; chỉ đường
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Tổng phòng', areaRoomSummary.total, 'text-on-surface'],
                ['Sẵn sàng', areaRoomSummary.available, 'text-emerald-700'],
                ['Có khách', areaRoomSummary.occupied, 'text-primary'],
                ['Bảo trì', areaRoomSummary.maintenance, 'text-amber-800'],
              ].map(([k, v, c]) => (
                <div key={k as string} className="rounded bg-surface-container-low px-4 py-3">
                  <dt className="text-xs text-on-surface-variant">{k}</dt>
                  <dd className={`text-xl font-bold ${c}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </header>

          {selectedMapArea?.areaType !== 'Building' ? (
            <div className="p-10 text-center">
              <span className="material-symbols-outlined text-4xl text-outline-variant">touch_app</span>
              <p className="mt-2 font-semibold">Chọn một Building để xem danh sách phòng</p>
              <p className="mt-1 text-sm text-on-surface-variant">Zone chỉ hiển thị số liệu tổng quan; phòng được quản lý theo từng tòa.</p>
            </div>
          ) : (
            <div className="p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[180px] flex-1">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
                  <input aria-label="Tìm số phòng" placeholder="Số phòng…" value={search} onChange={e => setSearch(e.target.value)}
                    className="h-10 w-full rounded-full bg-surface-container-low pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                <select aria-label="Trạng thái phòng" value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-full bg-surface-container-low px-4 text-sm outline-none">
                  <option value="all">Mọi trạng thái</option>
                  {Object.entries(STATUS_UI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <span className="text-sm text-on-surface-variant">{filteredRooms.length}/{clusterRooms.length} phòng</span>
              </div>
              {!filteredRooms.length ? (
                <p className="rounded bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">Không có phòng phù hợp.</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(roomsByFloor).map(([floor, list]) => (
                    <div key={floor}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-outline">Tầng {floor} · {list.length} phòng</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                        {list.map(room => {
                          const ui = STATUS_UI[room.isActive ? room.status : 'Inactive'] ?? STATUS_UI.Inactive;
                          return (
                            <article key={room.roomId} className={`rounded border border-outline-variant/40 p-3 ${room.isActive ? '' : 'opacity-60'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-lg font-bold text-on-surface">{room.roomNumber}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${ui.className}`}>{ui.label}</span>
                              </div>
                              <p className="mt-1 text-xs text-on-surface-variant">{room.capacity} khách · {room.price.toLocaleString('vi-VN')} ₫/đêm</p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    )}

    {/* Thông tin & chỉ đường */}
    {detailsOpen && selectedMapArea && selectedCluster && <>
      <button type="button" aria-label="Đóng thông tin khu vực" onClick={() => setDetailsOpen(false)} className="fixed inset-0 z-[60] bg-inverse-surface/30 backdrop-blur-[1px]" />
      <aside role="dialog" aria-modal="true" aria-label={`Thông tin khu vực ${selectedMapArea.areaName}`}
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-surface-container-lowest shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{selectedMapArea.areaType === 'Zone' ? 'Zone' : 'Building'}</p>
            <h2 className="mt-0.5 text-xl font-semibold">{selectedMapArea.areaName}</h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">{selectedCluster.hotelName}</p>
          </div>
          <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Đóng"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <dl className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
          {[
            ['Địa chỉ khách sạn', selectedCluster.hotelAddress],
            ['Vị trí nội bộ', selectedMapArea.locationDescription],
            ['Mô tả', selectedMapArea.description],
            ['Số tầng', selectedMapArea.floorCount ? String(selectedMapArea.floorCount) : ''],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-on-surface-variant">{k}</dt><dd className="mt-0.5 font-medium text-on-surface">{v || 'Chưa cập nhật'}</dd></div>
          ))}
        </dl>
        <footer className="border-t border-outline-variant/40 px-6 py-4">
          <button type="button" onClick={() => { const query = [selectedCluster.hotelName, selectedCluster.hotelAddress, selectedMapArea.areaName, selectedMapArea.locationDescription].filter(Boolean).join(', '); window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer'); }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary hover:opacity-90">
            <span className="material-symbols-outlined text-[19px]">directions</span>Mở chỉ đường (Google Maps)
          </button>
        </footer>
      </aside>
    </>}
  </section>;
};
