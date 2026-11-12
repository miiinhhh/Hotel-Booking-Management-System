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
  const visibleAreaIds = selectedMapArea?.areaType === 'Building'
    ? [selectedMapArea.areaId]
    : selectedCluster?.areaIds || [];
  const clusterRooms = selectedCluster
    ? rooms.filter(room => room.hotelId === selectedCluster.hotelId && visibleAreaIds.includes(room.areaId))
    : [];
  const areaRoomSummary = selectedMapArea ? {
    total: clusterRooms.length,
    available: clusterRooms.filter(room => room.status === 'Available').length,
    occupied: clusterRooms.filter(room => room.status === 'Occupied').length,
    maintenance: clusterRooms.filter(room => room.status === 'Maintenance').length,
  } : { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const filteredRooms = clusterRooms.filter(room =>
    room.roomNumber.toLowerCase().includes(search.trim().toLowerCase()) &&
    (status === 'all' || room.status === status));

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-3xl font-semibold">Phân khu & Buồng phòng</h1><p className="text-outline">Chuyển nhanh giữa các phân khu được giao để theo dõi và vận hành phòng.</p></div>
      <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="rounded-full bg-surface-container px-4 py-2 disabled:opacity-40">Làm mới</button>
    </header>

    {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    {loading && <p role="status">Đang tải phân khu được giao…</p>}
    {!loading && !clusters.length && !error && <p className="rounded-lg bg-surface-container-low p-5">Bạn chưa được phân công phụ trách phân khu nào.</p>}

    {!!clusters.length && <>
      <section aria-label="Phân khu được giao">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Cụm phân khu được giao</h2><p className="text-sm text-outline">Chọn một cụm để xem đúng danh sách phòng thuộc phạm vi phụ trách.</p></div>
          <span className="text-sm text-outline">{clusters.length} cụm</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clusters.map(cluster => {
            const selected = cluster.key === selectedClusterKey;
            return <button key={cluster.key} type="button" aria-pressed={selected}
              onClick={() => { setSelectedClusterKey(cluster.key); setSearch(''); setStatus('all'); }}
              className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-primary bg-primary-container text-on-primary-container shadow-sm' : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary/60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div><span className="text-xs font-semibold uppercase tracking-wide opacity-70">{cluster.hotelName}</span><h3 className="mt-1 text-lg font-semibold">{cluster.areaType === 'Zone' ? cluster.name : cluster.parentName || 'Zone chưa xác định'}</h3><p className="mt-1 text-sm opacity-75">{cluster.areaType === 'Zone' ? `Zone · ${areas.filter(area => area.parentAreaId === cluster.areaId).length} Building` : `Building · ${cluster.name}`}</p></div>
                <span className={`rounded-full px-3 py-1 text-sm ${selected ? 'bg-primary/10' : 'bg-surface-container'}`}>{cluster.roomCount} phòng</span>
              </div>
            </button>;
          })}
        </div>
      </section>

      {selectedCluster && <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" aria-label="Sơ đồ phân khu">
        <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 px-5 py-4">
            <div><h2 className="text-xl font-semibold">Cấu trúc khu vực được giao</h2><p className="text-sm text-outline">Khách sạn → Zone → Building → Phòng</p></div>
            <span className="material-symbols-outlined rounded-full bg-primary-container p-2 text-on-primary-container">account_tree</span>
          </div>
          <div className="bg-surface-container-low p-5">
            <div className="rounded-2xl border-2 border-outline-variant/40 bg-surface-container-lowest p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <span className="material-symbols-outlined rounded-full bg-primary-container p-2 text-on-primary-container">hotel</span>
                <div><span className="text-xs font-semibold uppercase tracking-wide text-outline">Khách sạn</span><h3 className="text-lg font-semibold">{selectedCluster.hotelName}</h3><p className="text-sm text-outline">{selectedCluster.hotelAddress || 'Chưa cập nhật địa chỉ'}</p></div>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary-fixed/20 p-4">
                <button type="button" disabled={selectedCluster.areaType !== 'Zone'}
                  onClick={() => { if (selectedZone) { setSelectedMapAreaId(selectedZone.areaId); setSearch(''); setStatus('all'); } }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedMapArea?.areaType === 'Zone' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container-lowest'} disabled:cursor-default`}>
                  <span className="material-symbols-outlined">location_on</span>
                  <div><span className="text-xs font-semibold uppercase opacity-70">Zone</span><h3 className="font-semibold">{selectedZone?.areaName || selectedCluster.parentName || selectedCluster.name}</h3><p className="text-sm opacity-75">{selectedZone?.locationDescription || selectedZone?.description || 'Khu vực chứa các tòa nhà được giao'}</p></div>
                </button>

                <div className="ml-5 mt-3 border-l-2 border-primary/25 pl-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-outline">Building thuộc Zone</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {zoneBuildings.map(building => {
                      const active = building.areaId === selectedMapArea?.areaId;
                      const buildingRoomCount = rooms.filter(room => room.hotelId === building.hotelId && room.areaId === building.areaId).length;
                      return <button key={building.areaId} type="button" onClick={() => { setSelectedMapAreaId(building.areaId); setSearch(''); setStatus('all'); }}
                        className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${active ? 'border-primary bg-primary-container text-on-primary-container shadow-sm' : 'border-outline-variant/40 bg-surface-container-lowest'}`}>
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined">apartment</span><div><span className="text-xs uppercase opacity-70">Building</span><h4 className="font-semibold">{building.areaName}</h4></div></div>
                        <p className="mt-2 text-sm opacity-75">{building.locationDescription || building.description || 'Chưa cập nhật vị trí trong Zone.'}</p>
                        <span className="mt-3 inline-block rounded-full bg-surface-container/70 px-3 py-1 text-xs">{buildingRoomCount} phòng</span>
                      </button>;
                    })}
                    {!zoneBuildings.length && <p className="rounded-xl bg-surface-container-lowest p-4 text-sm text-outline">Chưa có Building được giao trong Zone này.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Khu vực đang chọn</span>
          <h2 className="mt-1 text-2xl font-semibold">{selectedMapArea?.areaName || selectedCluster.name}</h2>
          <p className="mt-1 text-sm text-outline">{selectedCluster.hotelName} · Zone {selectedZone?.areaName || selectedCluster.parentName || selectedCluster.name}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-outline">Vị trí nội bộ</dt><dd className="font-medium">{selectedMapArea?.locationDescription || 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-outline">Mô tả</dt><dd className="font-medium">{selectedMapArea?.description || 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-outline">Số tầng</dt><dd className="font-medium">{selectedMapArea?.floorCount || 'Chưa cập nhật'}</dd></div>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-xl bg-surface-container-low p-3"><strong className="block text-lg">{areaRoomSummary.total}</strong> Tổng phòng</div>
            <div className="rounded-xl bg-surface-container-low p-3"><strong className="block text-lg text-primary">{areaRoomSummary.available}</strong> Khả dụng</div>
            <div className="rounded-xl bg-surface-container-low p-3"><strong className="block text-lg">{areaRoomSummary.occupied}</strong> Có khách</div>
            <div className="rounded-xl bg-surface-container-low p-3"><strong className="block text-lg">{areaRoomSummary.maintenance}</strong> Bảo trì</div>
          </div>
          <button type="button" onClick={() => {
            const query = [selectedCluster.hotelName, selectedCluster.hotelAddress, selectedMapArea?.areaName, selectedMapArea?.locationDescription].filter(Boolean).join(', ');
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
          }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-on-primary">
            <span className="material-symbols-outlined text-[19px]">directions</span> Mở chỉ đường
          </button>
        </aside>
      </section>}

      <div className="flex flex-wrap gap-3 rounded-xl bg-surface-container-low p-4">
        <input aria-label="Số phòng" placeholder="Tìm số phòng…" value={search} onChange={event => setSearch(event.target.value)} className="min-w-52 flex-1 rounded-lg bg-surface-container-lowest p-3" />
        <select aria-label="Trạng thái phòng" value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg bg-surface-container-lowest p-3">
          <option value="all">Mọi trạng thái</option><option value="Available">Available</option><option value="Occupied">Occupied</option><option value="Maintenance">Maintenance</option><option value="Inactive">Inactive</option>
        </select>
      </div>

      {!filteredRooms.length ? <p>Không có phòng phù hợp trong phân khu đang chọn.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredRooms.map(room => <article key={room.roomId} className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Phòng {room.roomNumber}</h2>
          <p>{areas.find(area => area.hotelId === room.hotelId && area.areaId === room.areaId)?.areaName} · Tầng {room.floor}</p>
          <p>{room.status} · {room.capacity} khách</p><p className="mt-2 text-primary">{room.price.toLocaleString('vi-VN')} ₫ / đêm</p>
        </article>)}
      </div>}
    </>}
  </section>;
};
