import React, { useEffect, useState } from 'react';
import { roomApi, RoomDto, HotelAreaDto, RoomLock } from '../../../services/roomApi';
import { getMyAssignedAreas } from '../../../services/staffAssignmentApi';
import { useAuth } from '../../../context/AuthContext';
import { EmergencyLockModal } from './EmergencyLockModal';

interface StaffSuitesViewProps { onShowToast?: (message: string) => void; onNavigateToReservations?: (zoneCode?: string) => void }
export const StaffSuitesView: React.FC<StaffSuitesViewProps> = ({ onShowToast }) => {
  const { hasRole, session } = useAuth();
  const [hotelId, setHotelId] = useState(1);
  const [areas, setAreas] = useState<HotelAreaDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [locks, setLocks] = useState<RoomLock[]>([]);
  const [selectedArea, setSelectedArea] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [lockRooms, setLockRooms] = useState<number[] | null>(null);
  const [revision, setRevision] = useState(0);
  const admin = hasRole('Admin');
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRooms([]); setAreas([]); setLocks([]); setSelectedArea(0); setLockRooms(null);
    Promise.all([roomApi.areas(hotelId), roomApi.rooms(hotelId), roomApi.locks(hotelId), admin ? Promise.resolve(null) : getMyAssignedAreas(hotelId)])
      .then(([areaData, roomData, lockData, assigned]) => {
        if (!active) return;
        if (assigned && !assigned.success) throw new Error(assigned.message || 'Không tải được phạm vi phụ trách.');
        const ids = new Set(assigned?.data?.map(a => a.areaId) || []);
        const allowed = areaData.filter(a => admin || ids.has(a.areaId) || (a.parentAreaId !== null && ids.has(a.parentAreaId)));
        setAreas(allowed); setRooms(roomData.filter(r => allowed.some(a => a.areaId === r.areaId))); setLocks(lockData);
      }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được buồng phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hotelId, admin, revision, session?.accessToken]);
  const release = async (lock: RoomLock) => {
    if (pending) return; setPending(true); setError('');
    try { const updated = await roomApi.release(hotelId, lock.lockId); setLocks(current => current.map(x => x.lockId === updated.lockId ? updated : x)); onShowToast?.('Đã mở bán lại phòng.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không mở bán lại được.'); }
    finally { setPending(false); }
  };
  const activeLocks = locks.filter(l => l.status === 'Active' || l.status === 'Scheduled');
  const filtered = rooms.filter(r => (!selectedArea || r.areaId === selectedArea) && r.roomNumber.toLowerCase().includes(search.toLowerCase()) &&
    (status === 'all' || (status === 'locked' ? activeLocks.some(l => l.roomId === r.roomId) : r.status === status)));
  return <section className="space-y-5">
    <header><h1 className="text-3xl font-semibold">Phân khu & Buồng phòng</h1><p className="text-outline">Trạng thái phòng và lệnh khóa bán từ hệ thống.</p></header>
    <form onSubmit={e => { e.preventDefault(); const id = Number(new FormData(e.currentTarget).get('hotel')); if (Number.isSafeInteger(id) && id > 0) setHotelId(id); }} className="flex flex-wrap gap-3"><label>Mã khách sạn <input key={hotelId} name="hotel" type="number" min="1" step="1" required defaultValue={hotelId} className="rounded-lg bg-surface-container-low p-2" /></label><button disabled={pending} className="rounded-full bg-primary px-5 py-2 text-on-primary">Xem</button><button type="button" disabled={loading || pending} onClick={() => setRevision(r => r + 1)} className="rounded-full bg-surface-container px-4">Làm mới</button></form>
    {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    <div className="flex flex-wrap gap-3"><select aria-label="Phân khu" value={selectedArea} onChange={e => setSelectedArea(Number(e.target.value))} className="rounded-lg bg-surface-container-low p-3"><option value={0}>Tất cả khu vực được giao</option>{areas.map(a => <option key={a.areaId} value={a.areaId}>{a.areaName}</option>)}</select><input aria-label="Số phòng" placeholder="Tìm số phòng…" value={search} onChange={e => setSearch(e.target.value)} className="rounded-lg bg-surface-container-low p-3" /><select aria-label="Trạng thái phòng" value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg bg-surface-container-low p-3"><option value="all">Mọi trạng thái</option><option value="Available">Available</option><option value="Occupied">Occupied</option><option value="Maintenance">Maintenance</option><option value="Inactive">Inactive</option><option value="locked">Có lệnh khóa bán</option></select></div>
    {loading ? <p role="status">Đang tải phòng…</p> : !filtered.length ? <p>Không có phòng phù hợp trong khu vực được giao.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(r => <article key={r.roomId} className="rounded-lg bg-surface-container-lowest p-5 shadow-sm"><h2 className="text-xl font-semibold">Phòng {r.roomNumber}</h2><p>{areas.find(a => a.areaId === r.areaId)?.areaName} · Tầng {r.floor}</p><p>{r.status} · {r.capacity} khách</p><p className="my-2 text-primary">{r.price.toLocaleString('vi-VN')} ₫ / đêm</p><button disabled={!r.isActive || pending} onClick={() => setLockRooms([r.roomId])} className="rounded-full bg-error-container px-4 py-2 text-on-error-container disabled:opacity-40">Khóa bán</button></article>)}</div>}
    <section className="rounded-lg bg-surface-container-lowest p-5"><h2 className="mb-3 text-xl font-semibold">Lịch sử khóa bán</h2>{!loading && !locks.length && <p>Chưa có lệnh khóa.</p>}{locks.map(lock => <div key={lock.lockId} className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 py-3"><div><strong>#{lock.lockId} · Phòng {rooms.find(r => r.roomId === lock.roomId)?.roomNumber || lock.roomId}</strong><p>{new Date(/Z$|[+-]\d{2}:\d{2}$/.test(lock.startsAt) ? lock.startsAt : lock.startsAt + 'Z').toLocaleString('vi-VN')} – {new Date(/Z$|[+-]\d{2}:\d{2}$/.test(lock.endsAt) ? lock.endsAt : lock.endsAt + 'Z').toLocaleString('vi-VN')}</p><p>{lock.reason} · {lock.status}</p></div>{(lock.status === 'Active' || lock.status === 'Scheduled') && <button disabled={pending} onClick={() => void release(lock)} className="rounded-full bg-primary px-4 py-2 text-on-primary disabled:opacity-40">Mở bán lại</button>}</div>)}</section>
    <EmergencyLockModal isOpen={lockRooms !== null} hotelId={hotelId} initialRoomIds={lockRooms || undefined} onClose={() => setLockRooms(null)} onConfirmLock={() => { setRevision(r => r + 1); onShowToast?.('Đã lưu lệnh khóa bán.'); }} />
  </section>;
};
