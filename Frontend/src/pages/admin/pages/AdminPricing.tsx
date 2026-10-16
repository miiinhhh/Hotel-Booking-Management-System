import React, { FormEvent, useMemo, useState } from 'react';
import { formatCurrency, ROOM_TYPES, ZONES } from '../data/adminData';
import { PageHeading, Toast } from '../components/AdminUi';

export const AdminPricing: React.FC = () => {
  const [selectedRoomId, setSelectedRoomId] = useState(ROOM_TYPES[0].id);
  const selectedRoom = useMemo(
    () => ROOM_TYPES.find((room) => room.id === selectedRoomId) ?? ROOM_TYPES[0],
    [selectedRoomId]
  );
  const [basePrice, setBasePrice] = useState(selectedRoom.price);
  const [effectiveFrom, setEffectiveFrom] = useState('2026-10-16');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const chooseRoom = (roomId: number) => {
    const room = ROOM_TYPES.find((item) => item.id === roomId);
    if (!room) return;
    setSelectedRoomId(roomId);
    setBasePrice(room.price);
  };

  const savePrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setToast('Đã ghi nhận cấu hình giá phòng mới.');
    window.setTimeout(() => setToast(null), 2600);
  };

  const difference = basePrice - selectedRoom.price;
  const differencePercent = selectedRoom.price
    ? Math.round((difference / selectedRoom.price) * 100)
    : 0;

  return <>
    <PageHeading
      title="Cấu hình Giá phòng"
      description="Quản lý giá cơ sở và thời gian hiệu lực theo dữ liệu RoomTypes và RoomPriceHistory."
    />

    <form onSubmit={savePrice} className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
      <div className="space-y-6">
        <section className="grid gap-3 rounded-lg bg-surface-container-low p-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase text-outline">
            Phân khu
            <select className="mt-1 block h-11 w-full rounded-lg bg-white px-4 text-sm normal-case text-on-surface outline-none">
              {ZONES.map((zone) => <option key={zone.id}>{zone.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-outline">
            Hạng phòng
            <select
              value={selectedRoomId}
              onChange={(event) => chooseRoom(Number(event.target.value))}
              className="mt-1 block h-11 w-full rounded-lg bg-white px-4 text-sm normal-case text-on-surface outline-none"
            >
              {ROOM_TYPES.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
        </section>

        <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Giá bán cơ sở</p>
              <h2 className="mt-1 font-headline-sm text-xl font-semibold">{selectedRoom.name}</h2>
              <p className="text-sm text-outline">Mã hạng phòng: {selectedRoom.code}</p>
            </div>
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Đang mở bán</span>
          </div>

          <div className="rounded-lg bg-primary-fixed/25 p-6">
            <label className="text-xs font-semibold uppercase text-on-surface-variant">Giá mỗi đêm (VNĐ)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                required
                type="number"
                min="0"
                step="50000"
                value={basePrice}
                onChange={(event) => setBasePrice(Number(event.target.value))}
                className="min-w-0 flex-1 bg-transparent font-headline-lg text-3xl font-semibold text-primary outline-none md:text-4xl"
              />
              <span className="text-xl font-semibold text-primary">₫</span>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">Giá hiện tại: <strong>{formatCurrency(selectedRoom.price)}</strong></p>
          </div>
        </section>

        <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase text-primary">Thời gian áp dụng</p>
            <h2 className="mt-1 font-headline-sm text-xl font-semibold">Hiệu lực của mức giá</h2>
            <p className="text-sm text-outline">Tương ứng với EffectiveFrom và EffectiveTo trong RoomPriceHistory.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Bắt đầu áp dụng
              <input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="text-sm font-semibold">
              Kết thúc (không bắt buộc)
              <input type="date" min={effectiveFrom} value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <article className="overflow-hidden rounded-lg bg-inverse-surface text-inverse-on-surface shadow-xl">
          <img src={selectedRoom.image} alt={selectedRoom.name} className="h-48 w-full object-cover" />
          <div className="space-y-5 p-6">
            <div>
              <p className="text-xs font-semibold uppercase text-white/60">Xem trước giá bán</p>
              <h2 className="mt-2 font-headline-sm text-xl font-semibold text-white">{selectedRoom.name}</h2>
            </div>
            <div>
              <p className="text-sm text-white/60">Giá phòng mỗi đêm</p>
              <p className="mt-1 font-headline-md text-3xl font-semibold text-secondary-fixed">{formatCurrency(basePrice)}</p>
            </div>
            <div className="border-t border-white/20 pt-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-white/60">Thay đổi</span><strong className={difference >= 0 ? 'text-secondary-fixed' : 'text-emerald-300'}>{difference >= 0 ? '+' : ''}{formatCurrency(difference)} ({differencePercent >= 0 ? '+' : ''}{differencePercent}%)</strong></div>
              <div className="mt-3 flex justify-between gap-3"><span className="text-white/60">Hiệu lực từ</span><strong>{effectiveFrom || 'Chưa chọn'}</strong></div>
              <div className="mt-3 flex justify-between gap-3"><span className="text-white/60">Hiệu lực đến</span><strong>{effectiveTo || 'Không giới hạn'}</strong></div>
            </div>
          </div>
        </article>
        <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary shadow-md">
          <span className="material-symbols-outlined text-lg">save</span>
          Lưu giá phòng
        </button>
      </aside>
    </form>

    <Toast message={toast} />
  </>;
};
