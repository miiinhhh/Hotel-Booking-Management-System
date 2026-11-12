import React, { FormEvent, useEffect, useState } from 'react';
import { roomApi, RoomDto } from '../../../services/roomApi';
import { EmergencyLockFormData } from '../types';

interface EmergencyLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLock: (data: EmergencyLockFormData) => void;
  hotelId?: number;
  initialRoomIds?: number[];
  allowedRoomIds?: number[];
  initialCategory?: string;
  initialRoomNumber?: string;
}
export const EmergencyLockModal: React.FC<EmergencyLockModalProps> = ({ isOpen, onClose, onConfirmLock, hotelId, initialRoomIds, allowedRoomIds, initialRoomNumber }) => {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen && !hotelId) setError('Không xác định được khách sạn từ phân khu được giao.');
  }, [isOpen, hotelId]);
  useEffect(() => {
    if (!isOpen) return;
    let active = true; setLoading(true); setRooms([]); setError(''); setSelected([]); setReason('');
    const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStart(localInput(new Date())); setEnd(localInput(new Date(Date.now() + 86400000)));
    if (!hotelId) { setLoading(false); return; }
    roomApi.rooms(hotelId).then(items => {
      if (!active) return;
      const permittedItems = allowedRoomIds?.length ? items.filter(r => allowedRoomIds.includes(r.roomId)) : items;
      setRooms(permittedItems);
      // Room numbers are resolved against the database; never guess an ID.
      const number = initialRoomNumber?.replace(/^P\./, '');
      const matches = permittedItems.filter(r => number && r.roomNumber === number);
      setSelected(initialRoomIds ? permittedItems.filter(r => initialRoomIds.includes(r.roomId)).map(r => r.roomId) : matches.length === 1 ? [matches[0].roomId] : []);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, hotelId, initialRoomNumber, initialRoomIds, allowedRoomIds]);
  if (!isOpen) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    if (!selected.length || !start || !end || new Date(start) >= new Date(end) || !reason.trim()) { setError('Chọn phòng, khoảng thời gian hợp lệ và lý do khóa.'); return; }
    setSaving(true); setError('');
    try {
      if (!hotelId) throw new Error('Không xác định được khách sạn từ phân khu được giao.');
      await roomApi.lock(hotelId, { roomIds: selected, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), reason: reason.trim() });
      onConfirmLock({ buildingAndCategory: 'Phân khu được giao', roomNumbers: rooms.filter(r => selected.includes(r.roomId)).map(r => r.roomNumber), startDate: start, endDate: end, reason: 'other', internalNotes: reason.trim() });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được lệnh khóa.'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/40 p-4"><section role="dialog" aria-modal="true" aria-label="Khóa bán phòng" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-container-lowest p-6 shadow-xl"><h2 className="mb-4 text-2xl font-semibold">Khóa bán phòng</h2>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-error-container p-3 text-on-error-container">{error}</p>}
      {loading ? <p role="status">Đang tải phòng…</p> : <div className="max-h-56 overflow-y-auto">{rooms.filter(r => r.isActive).map(r => <label key={r.roomId} className="mb-2 flex items-center gap-3 rounded-lg bg-surface-container-low p-3"><input type="checkbox" checked={selected.includes(r.roomId)} onChange={e => setSelected(current => e.target.checked ? [...current, r.roomId] : current.filter(id => id !== r.roomId))} /><span>Phòng {r.roomNumber} · Khu vực #{r.areaId} · {r.status}</span></label>)}{!rooms.length && <p>Không có phòng trong khách sạn này.</p>}</div>}
      <div className="grid gap-4 sm:grid-cols-2"><label>Bắt đầu<input type="datetime-local" required value={start} onChange={e => setStart(e.target.value)} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label><label>Kết thúc<input type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label></div>
      <label className="block">Lý do<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
      <p className="text-sm text-outline">Nếu phòng có booking hoặc lệnh khóa chồng lấn, hệ thống sẽ từ chối toàn bộ yêu cầu.</p>
    </fieldset><div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-full bg-surface-container px-5 py-2">Hủy</button><button disabled={saving || loading || !selected.length} className="rounded-full bg-primary px-5 py-2 text-on-primary disabled:opacity-50">{saving ? 'Đang khóa…' : 'Xác nhận khóa bán'}</button></div></form>
  </section></div>;
};
