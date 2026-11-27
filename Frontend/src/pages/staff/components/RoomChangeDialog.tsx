import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/apiClient';

interface RoomOption { roomId: number; roomNumber: string; floor: number; roomTypeName: string }

interface Props {
  open: boolean;
  bookingId: number;
  bookingCode: string;
  /** Các phòng hiện tại của đơn. */
  rooms: { roomId: number; roomNumber: string }[];
  /** false = phòng do hệ thống xếp tạm: cho phép "Giữ phòng này" để chốt. */
  assigned?: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * Lễ tân xếp/đổi số phòng cho đơn sang phòng khác CÙNG HẠNG còn trống
 * (khi nhận phòng, phòng cần bảo trì, khách muốn đổi tầng). Không đổi ngày, không đổi giá.
 */
export const RoomChangeDialog: React.FC<Props> = ({ open, bookingId, bookingCode, rooms, assigned = true, onClose, onDone }) => {
  const [currentRoomId, setCurrentRoomId] = useState<number>(rooms[0]?.roomId ?? 0);
  const [options, setOptions] = useState<RoomOption[] | null>(null);
  const [newRoomId, setNewRoomId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setCurrentRoomId(rooms[0]?.roomId ?? 0); setReason(''); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !currentRoomId) return;
    let alive = true;
    setOptions(null); setNewRoomId(null); setError('');
    apiClient<RoomOption[]>(`/api/bookings/${bookingId}/room-options?currentRoomId=${currentRoomId}`).then(res => {
      if (!alive) return;
      if (res.success && res.data) setOptions(res.data); else { setOptions([]); setError(res.message || 'Không tải được danh sách phòng trống.'); }
    });
    return () => { alive = false; };
  }, [open, bookingId, currentRoomId]);

  if (!open) return null;

  const submit = async () => {
    if (!newRoomId || saving) return;
    setSaving(true); setError('');
    const res = await apiClient<unknown>(`/api/bookings/${bookingId}/change-room`, {
      method: 'POST', body: JSON.stringify({ currentRoomId, newRoomId, reason: reason.trim() || null }),
    });
    setSaving(false);
    if (res.success) onDone(res.message || 'Đã đổi phòng.');
    else setError(res.message || 'Không đổi được phòng.');
  };

  const byFloor = new Map<number, RoomOption[]>();
  for (const o of options ?? []) byFloor.set(o.floor, [...(byFloor.get(o.floor) ?? []), o]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/40 p-4" role="dialog" aria-modal="true" aria-labelledby="room-change-title">
      <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
        <h2 id="room-change-title" className="text-lg font-semibold text-on-surface">{assigned ? 'Đổi phòng' : 'Xếp phòng'}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Đơn {bookingCode} · chỉ hiện phòng <b>cùng hạng</b> còn trống suốt thời gian lưu trú. Ngày và giá giữ nguyên.</p>

        {rooms.length > 1 && (
          <label className="mt-4 block text-sm font-semibold text-on-surface">Phòng cần đổi
            <select value={currentRoomId} onChange={e => setCurrentRoomId(Number(e.target.value))}
              className="mt-1 h-11 w-full rounded-full border border-outline-variant/60 bg-surface-container-low px-4 font-normal">
              {rooms.map(r => <option key={r.roomId} value={r.roomId}>Phòng {r.roomNumber}</option>)}
            </select>
          </label>
        )}
        {rooms.length === 1 && <p className="mt-4 text-sm text-on-surface">Phòng hiện tại: <b>{rooms[0].roomNumber}</b>{assigned ? ' · đã xếp' : ' · hệ thống xếp tạm'}</p>}
        {!assigned && (
          <button type="button" aria-pressed={newRoomId === currentRoomId} onClick={() => setNewRoomId(currentRoomId)}
            className={`mt-3 flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm ${newRoomId === currentRoomId ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant/60 hover:bg-surface-container-low'}`}>
            <span className="material-symbols-outlined text-[20px] text-primary">{newRoomId === currentRoomId ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
            <span><b>Giữ phòng {rooms.find(r => r.roomId === currentRoomId)?.roomNumber}</b> · chốt phòng hệ thống đã xếp tạm</span>
          </button>
        )}
        {!assigned && <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Hoặc chọn phòng khác</p>}

        <div className="mt-4 max-h-64 overflow-y-auto">
          {options === null ? <p role="status" className="py-6 text-center text-sm text-on-surface-variant">Đang tìm phòng trống…</p>
            : !options.length ? <p className="rounded-2xl bg-surface-container-low p-4 text-center text-sm text-on-surface-variant">Không còn phòng cùng hạng nào khác trống trong thời gian này{error ? '' : ' (trong khu vực bạn phụ trách)'}.</p>
            : Array.from(byFloor.entries()).sort((a, b) => a[0] - b[0]).map(([floor, list]) => (
              <div key={floor} className="mb-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Tầng {floor}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map(o => (
                    <button key={o.roomId} type="button" aria-pressed={newRoomId === o.roomId} onClick={() => setNewRoomId(o.roomId)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${newRoomId === o.roomId ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/60 text-on-surface hover:bg-surface-container-low'}`}>
                      {o.roomNumber}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <label className="mt-3 block text-sm font-semibold text-on-surface">Lý do (tùy chọn)
          <input value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="VD: Khách muốn tầng cao, phòng cũ cần bảo trì…"
            className="mt-1 h-11 w-full rounded-full border border-outline-variant/60 bg-surface-container-low px-4 text-sm font-normal" />
        </label>

        {error && <p role="alert" className="mt-3 rounded-2xl bg-error-container p-3 text-sm text-on-error-container">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button>
          <button type="button" disabled={!newRoomId || saving} onClick={() => void submit()}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40">{saving ? 'Đang lưu…' : newRoomId === currentRoomId ? 'Chốt phòng này' : assigned ? 'Đổi phòng' : 'Xếp phòng'}</button>
        </div>
      </div>
    </div>
  );
};
export default RoomChangeDialog;
