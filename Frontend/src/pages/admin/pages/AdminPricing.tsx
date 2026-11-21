import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal, PageHeading, Toast } from '../components/AdminUi';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import { formatVnd } from '../../../utils/formatters';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import {
  createRoomPriceHistory,
  getHotelsList,
  getRoomPriceHistories,
  getRoomTypesByHotel,
  HotelDto,
  RoomPriceHistoryDto,
  RoomTypeDto,
  updateRoomTypeBasePrice,
} from '../../../services/pricingAdminApi';

/* ============================================================================
 * Tiện ích
 * ========================================================================== */

type Period = 'active' | 'overridden' | 'upcoming' | 'ended';
type HistoryFilter = 'all' | 'current' | 'ended';

const todayIso = () => new Date().toISOString().split('T')[0];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Trạng thái của một khoảng giá so với hiện tại. */
const periodOf = (h: RoomPriceHistoryDto, now = Date.now()): Exclude<Period, 'overridden'> => {
  const from = new Date(h.effectiveFrom).getTime();
  const to = h.effectiveTo ? new Date(h.effectiveTo).getTime() : Infinity;
  if (from > now) return 'upcoming';
  if (to <= now) return 'ended';
  return 'active';
};

/** Khoảng giá đang có hiệu lực; nếu chồng lấn, bản tạo sau cùng thắng. */
const findCurrent = (list: RoomPriceHistoryDto[]) =>
  list.filter(h => periodOf(h) === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

const PERIOD_UI: Record<Period, { label: string; className: string }> = {
  active: { label: 'Đang áp dụng', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  overridden: { label: 'Bị ghi đè', className: 'bg-secondary-fixed/60 text-on-secondary-container ring-secondary/20' },
  upcoming: { label: 'Sắp áp dụng', className: 'bg-primary-fixed/50 text-primary ring-primary/20' },
  ended: { label: 'Đã kết thúc', className: 'bg-surface-container-high text-outline ring-outline/20' },
};

/** "+12,5%" / "−10%" / "Bằng giá gốc" */
const diffLabel = (price: number, base: number) => {
  if (!base || Math.abs(price - base) < 1) return 'Bằng giá gốc';
  const pct = ((price - base) / base) * 100;
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
};

const QUICK = [-10, 10, 20, 50];

/* ============================================================================
 * Trang
 * ========================================================================== */

export const AdminPricing: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManagePricing = hasPermission(PERMISSIONS.pricingManage);
  const canManageRoomTypes = hasPermission(PERMISSIONS.roomManage);

  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number>(0);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number>(0);
  const [priceHistories, setPriceHistories] = useState<RoomPriceHistoryDto[]>([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  // Hộp thoại "Đặt giá theo lịch"
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newPrice, setNewPrice] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso);
  const [effectiveTo, setEffectiveTo] = useState('');
  // Hộp thoại "Sửa giá gốc"
  const [baseOpen, setBaseOpen] = useState(false);
  const [baseDraft, setBaseDraft] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 3000); };

  // 1. Khách sạn
  useEffect(() => {
    let active = true;
    getHotelsList().then(res => {
      if (!active) return;
      const items = res.success && res.data?.items?.length ? res.data.items : [{ hotelId: 1, hotelName: 'Khách sạn StayLuxe' }];
      setHotels(items);
      setSelectedHotelId(items[0].hotelId);
    }).catch(() => {
      if (!active) return;
      setHotels([{ hotelId: 1, hotelName: 'Khách sạn StayLuxe' }]);
      setSelectedHotelId(1);
    });
    return () => { active = false; };
  }, []);

  // 2. Hạng phòng của khách sạn
  useEffect(() => {
    if (!selectedHotelId) return;
    let active = true;
    setLoading(true); setError(null);
    getRoomTypesByHotel(selectedHotelId).then(res => {
      if (!active) return;
      if (res.success && res.data) {
        setRoomTypes(res.data);
        setSelectedRoomTypeId(res.data[0]?.roomTypeId ?? 0);
      } else setError(res.message || 'Không thể tải danh sách hạng phòng.');
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tải hạng phòng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedHotelId]);

  // 3. Lịch sử giá của hạng phòng đang chọn
  const loadHistories = async (hotelId = selectedHotelId, typeId = selectedRoomTypeId) => {
    if (!hotelId || !typeId) { setPriceHistories([]); return; }
    setHistoriesLoading(true);
    try {
      const res = await getRoomPriceHistories(hotelId, typeId);
      setPriceHistories(res.success && res.data ? res.data : []);
    } catch { setPriceHistories([]); } finally { setHistoriesLoading(false); }
  };
  useEffect(() => { void loadHistories(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedHotelId, selectedRoomTypeId]);

  const selectedRoom = useMemo(() => roomTypes.find(r => r.roomTypeId === selectedRoomTypeId) || null, [roomTypes, selectedRoomTypeId]);
  const current = useMemo(() => findCurrent(priceHistories), [priceHistories]);
  const base = selectedRoom?.basePrice ?? 0;
  const effectivePrice = current?.price ?? base;

  const sortedHistories = useMemo(() => [...priceHistories].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()), [priceHistories]);
  const periodFor = (h: RoomPriceHistoryDto): Period => {
    const p = periodOf(h);
    return p === 'active' && current && h.priceHistoryId !== current.priceHistoryId ? 'overridden' : p;
  };
  const visibleHistories = sortedHistories.filter(h => {
    const p = periodOf(h);
    if (historyFilter === 'current') return p !== 'ended';
    if (historyFilter === 'ended') return p === 'ended';
    return true;
  });
  const counts = {
    all: sortedHistories.length,
    current: sortedHistories.filter(h => periodOf(h) !== 'ended').length,
    ended: sortedHistories.filter(h => periodOf(h) === 'ended').length,
  };
  const filteredTypes = roomTypes.filter(t => t.name.toLowerCase().includes(typeSearch.trim().toLowerCase()));

  /* ---------- Hành động ---------- */

  const openSchedule = () => {
    setNewPrice(effectivePrice); setEffectiveFrom(todayIso()); setEffectiveTo(''); setModalError(null); setScheduleOpen(true);
  };
  const openBase = () => { setBaseDraft(base); setModalError(null); setBaseOpen(true); };

  const savePriceHistory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManagePricing || !selectedRoom) return;
    if (!(newPrice > 0)) { setModalError('Giá phải lớn hơn 0.'); return; }
    if (effectiveTo && effectiveTo <= effectiveFrom) { setModalError('Ngày kết thúc phải sau ngày bắt đầu.'); return; }
    setIsSubmitting(true); setModalError(null);
    try {
      const res = await createRoomPriceHistory(selectedHotelId, selectedRoom.roomTypeId, {
        price: newPrice,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      });
      if (res.success && res.data) {
        setScheduleOpen(false);
        showToast(`Đã đặt giá ${formatVnd(newPrice)} cho ${selectedRoom.name}.`);
        await loadHistories();
      } else setModalError(res.message || 'Không thể lưu cấu hình giá.');
    } catch (err) { setModalError(err instanceof Error ? err.message : 'Lỗi kết nối khi lưu cấu hình giá.'); }
    finally { setIsSubmitting(false); }
  };

  const saveBasePrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoom) return;
    if (!(baseDraft > 0)) { setModalError('Giá gốc phải lớn hơn 0.'); return; }
    setIsSubmitting(true); setModalError(null);
    try {
      const res = await updateRoomTypeBasePrice(selectedHotelId, selectedRoom.roomTypeId, {
        name: selectedRoom.name, description: selectedRoom.description, basePrice: baseDraft,
        capacity: selectedRoom.capacity, numberOfBeds: selectedRoom.numberOfBeds,
      });
      if (res.success && res.data) {
        setRoomTypes(prev => prev.map(r => r.roomTypeId === selectedRoom.roomTypeId ? { ...r, basePrice: res.data!.basePrice } : r));
        setBaseOpen(false);
        showToast(`Đã cập nhật giá gốc ${selectedRoom.name}: ${formatVnd(baseDraft)}.`);
      } else setModalError(res.message || 'Không thể cập nhật giá gốc.');
    } catch (err) { setModalError(err instanceof Error ? err.message : 'Lỗi kết nối khi cập nhật giá gốc.'); }
    finally { setIsSubmitting(false); }
  };

  /* ---------- Giao diện ---------- */

  const priceInput = (value: number, onChange: (v: number) => void, autoFocus?: boolean) => (
    <div className="flex items-baseline gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
      <input required autoFocus={autoFocus} type="number" min="1" step="1000" value={value || ''} onChange={e => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 bg-transparent font-headline-sm text-3xl font-semibold text-primary outline-none" />
      <span className="text-lg font-semibold text-primary">₫ / đêm</span>
    </div>
  );

  return (
    <>
      <PageHeading title="Giá phòng" description="Xem giá đang áp dụng, lịch sử thay đổi và đặt giá theo khoảng thời gian cho từng hạng phòng." actions={
        <label className="flex items-center gap-2 rounded-full bg-surface-container-low py-1 pl-4 pr-1 text-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">hotel</span>
          <select aria-label="Khách sạn" value={selectedHotelId} onChange={e => setSelectedHotelId(Number(e.target.value))}
            className="max-w-[260px] rounded-full bg-transparent py-1.5 pr-2 font-semibold outline-none">
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        </label>
      } />

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded bg-error-container p-4 text-on-error-container">
          <span className="flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined">error</span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm font-semibold">Đóng</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-3 rounded-2xl bg-surface-container-lowest text-sm text-on-surface-variant shadow-sm">
          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>Đang tải hạng phòng…
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-lowest p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-outline-variant">bed</span>
          <h3 className="mt-3 font-semibold">Khách sạn chưa có hạng phòng</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Tạo hạng phòng ở mục “Phân khu &amp; hạng phòng” trước khi cấu hình giá.</p>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* ===== Trái: danh sách hạng phòng ===== */}
          <aside className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm lg:sticky lg:top-20">
            <h2 className="mb-3 px-1 font-semibold">Hạng phòng <span className="text-sm font-normal text-on-surface-variant">({roomTypes.length})</span></h2>
            {roomTypes.length > 5 && (
              <label className="relative mb-3 block">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
                <input value={typeSearch} onChange={e => setTypeSearch(e.target.value)} placeholder="Tìm hạng phòng…" aria-label="Tìm hạng phòng"
                  className="w-full rounded-full bg-surface-container-low py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </label>
            )}
            <div className="max-h-[calc(100vh-300px)] space-y-1 overflow-y-auto pr-1">
              {filteredTypes.map(t => {
                const active = t.roomTypeId === selectedRoomTypeId;
                return (
                  <button key={t.roomTypeId} type="button" onClick={() => setSelectedRoomTypeId(t.roomTypeId)}
                    className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary-container text-on-primary' : 'hover:bg-surface-container'} ${t.isActive ? '' : 'opacity-55'}`}>
                    <span className={`material-symbols-outlined text-[20px] ${active ? '' : 'text-primary'}`}>bed</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.name}</span>
                      <span className={`block truncate text-xs ${active ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                        Giá gốc {formatVnd(t.basePrice)}{t.isActive ? '' : ' · tạm dừng'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ===== Phải: chi tiết giá ===== */}
          {selectedRoom && (
            <div className="min-w-0 space-y-6">
              {/* Giá đang áp dụng */}
              {/* Nền sáng như các thẻ khác; chỉ con số giá và nút chính dùng màu thương hiệu */}
              <section className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 p-6 md:p-7">
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{selectedRoom.name}</span> · giá đang áp dụng mỗi đêm
                    </p>
                    <p className="mt-1 text-4xl font-bold tracking-tight text-primary md:text-[44px]">{formatVnd(effectivePrice)}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${current ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {current ? 'Theo lịch giá' : 'Giá gốc'}
                      </span>
                      {current
                        ? <>Từ {fmtDate(current.effectiveFrom)} đến {current.effectiveTo ? fmtDate(current.effectiveTo) : 'không thời hạn'}</>
                        : 'Không có lịch giá nào đang hiệu lực'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canManagePricing && <button type="button" onClick={openSchedule}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90">
                      <span className="material-symbols-outlined text-[18px]">event</span>Đặt giá theo lịch</button>}
                    {canManageRoomTypes && <button type="button" onClick={openBase}
                      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container">
                      <span className="material-symbols-outlined text-[18px]">edit</span>Sửa giá gốc</button>}
                  </div>
                </div>
                <dl className="grid grid-cols-2 border-t border-outline-variant/40 bg-surface-container-low/60 text-sm md:grid-cols-4">
                  {[
                    ['Giá gốc', formatVnd(base)],
                    ['So với giá gốc', diffLabel(effectivePrice, base)],
                    ['Sức chứa', `${selectedRoom.capacity} khách · ${selectedRoom.numberOfBeds} giường`],
                    ['Trạng thái', selectedRoom.isActive ? 'Đang mở bán' : 'Tạm dừng bán'],
                  ].map(([k, v]) => (
                    <div key={k} className="px-6 py-3 md:px-7">
                      <dt className="text-xs text-on-surface-variant">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-on-surface">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Biểu đồ */}
              <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Biến động giá</h2>
                  <button type="button" onClick={() => void loadHistories()} disabled={historiesLoading}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-50">
                    <span className={`material-symbols-outlined text-[18px] ${historiesLoading ? 'animate-spin' : ''}`}>refresh</span>Làm mới
                  </button>
                </div>
                {historiesLoading
                  ? <p className="py-10 text-center text-sm text-on-surface-variant">Đang tải lịch sử giá…</p>
                  : <PriceHistoryChart histories={priceHistories} roomTypeName={selectedRoom.name} currentBasePrice={base} />}
              </section>

              {/* Lịch sử */}
              <section className="rounded-2xl bg-surface-container-lowest shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4 md:px-6">
                  <h2 className="font-semibold">Lịch sử giá</h2>
                  <div className="flex gap-1 rounded-full bg-surface-container-low p-1 text-sm">
                    {([['all', 'Tất cả'], ['current', 'Đang & sắp áp dụng'], ['ended', 'Đã kết thúc']] as const).map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setHistoryFilter(id)}
                        className={`rounded-full px-3 py-1.5 font-medium ${historyFilter === id ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>
                        {label} <span className="text-xs text-outline">{counts[id]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {historiesLoading ? <p className="p-8 text-center text-sm text-on-surface-variant">Đang tải…</p>
                  : !visibleHistories.length ? (
                    <div className="p-10 text-center">
                      <span className="material-symbols-outlined text-4xl text-outline-variant">event_busy</span>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {priceHistories.length ? 'Không có khoảng giá nào trong bộ lọc này.' : `Chưa có lịch giá. Hạng phòng đang dùng giá gốc ${formatVnd(base)}.`}
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-outline-variant/30">
                      {visibleHistories.map(h => {
                        const p = periodFor(h);
                        return (
                          <li key={h.priceHistoryId} className={`flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 md:px-6 ${p === 'ended' ? 'opacity-60' : ''}`}>
                            <div className="min-w-[140px]">
                              <p className="text-lg font-semibold text-on-surface">{formatVnd(h.price)}</p>
                              <p className="text-xs text-on-surface-variant">{diffLabel(h.price, base)}</p>
                            </div>
                            <div className="flex min-w-[200px] flex-1 items-center gap-2 text-sm text-on-surface">
                              <span className="material-symbols-outlined text-[18px] text-outline">date_range</span>
                              {fmtDate(h.effectiveFrom)} → {h.effectiveTo ? fmtDate(h.effectiveTo) : <span className="text-on-surface-variant">Không thời hạn</span>}
                            </div>
                            <span className="text-xs text-outline">Tạo {new Date(h.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PERIOD_UI[p].className}`}>{PERIOD_UI[p].label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                <p className="border-t border-outline-variant/40 px-5 py-3 text-xs text-on-surface-variant md:px-6">
                  Khi không có lịch giá nào hiệu lực, hệ thống dùng giá gốc. Nếu nhiều lịch giá chồng nhau, lịch tạo sau cùng được áp dụng.
                </p>
              </section>
            </div>
          )}
        </div>
      )}

      {/* ===== Hộp thoại: Đặt giá theo lịch ===== */}
      <Modal title={`Đặt giá theo lịch · ${selectedRoom?.name ?? ''}`} open={scheduleOpen} onClose={() => { if (!isSubmitting) setScheduleOpen(false); }}>
        <form onSubmit={savePriceHistory} className="space-y-5">
          {modalError && <p role="alert" className="rounded bg-error-container p-3 text-sm text-on-error-container">{modalError}</p>}
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Giá mỗi đêm</label>
            {priceInput(newPrice, setNewPrice, true)}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-on-surface-variant">Theo giá gốc:</span>
              <button type="button" onClick={() => setNewPrice(base)} className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold hover:bg-surface-container-high">Giá gốc</button>
              {QUICK.map(pct => (
                <button key={pct} type="button" onClick={() => setNewPrice(Math.round(base * (100 + pct) / 100 / 1000) * 1000)}
                  className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold hover:bg-surface-container-high">{pct > 0 ? '+' : ''}{pct}%</button>
              ))}
              <span className="ml-auto text-xs font-semibold text-primary">{newPrice > 0 ? diffLabel(newPrice, base) : ''}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Bắt đầu áp dụng
              <input required type="date" min={todayIso()} value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                className="mt-1.5 h-11 w-full rounded border border-outline-variant bg-surface-container-lowest px-4 font-normal outline-none focus:border-primary" />
            </label>
            <label className="text-sm font-semibold">Kết thúc <span className="font-normal text-on-surface-variant">(bỏ trống = không thời hạn)</span>
              <input type="date" min={effectiveFrom} value={effectiveTo} onChange={e => setEffectiveTo(e.target.value)}
                className="mt-1.5 h-11 w-full rounded border border-outline-variant bg-surface-container-lowest px-4 font-normal outline-none focus:border-primary" />
            </label>
          </div>
          <p className="rounded bg-surface-container-low p-3 text-sm text-on-surface-variant">
            Áp dụng <strong className="text-on-surface">{newPrice > 0 ? formatVnd(newPrice) : '—'}</strong> từ <strong className="text-on-surface">{effectiveFrom ? fmtDate(effectiveFrom) : '—'}</strong>
            {effectiveTo ? <> đến <strong className="text-on-surface">{fmtDate(effectiveTo)}</strong></> : ' trở đi'}. Giá gốc không thay đổi.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" disabled={isSubmitting} onClick={() => setScheduleOpen(false)} className="rounded-full bg-surface-container px-5 py-2.5 font-semibold">Hủy</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-50">
              {isSubmitting && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}Áp dụng giá
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== Hộp thoại: Sửa giá gốc ===== */}
      <Modal title={`Sửa giá gốc · ${selectedRoom?.name ?? ''}`} open={baseOpen} onClose={() => { if (!isSubmitting) setBaseOpen(false); }}>
        <form onSubmit={saveBasePrice} className="space-y-5">
          {modalError && <p role="alert" className="rounded bg-error-container p-3 text-sm text-on-error-container">{modalError}</p>}
          <p className="text-sm text-on-surface-variant">
            Giá gốc được dùng khi không có lịch giá nào hiệu lực. Thay đổi có tác dụng ngay và không tạo bản ghi lịch sử giá.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Giá gốc mới</label>
            {priceInput(baseDraft, setBaseDraft, true)}
            <p className="mt-2 text-xs text-on-surface-variant">Hiện tại: <strong>{formatVnd(base)}</strong>{baseDraft > 0 && baseDraft !== base ? ` · ${diffLabel(baseDraft, base)}` : ''}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" disabled={isSubmitting} onClick={() => setBaseOpen(false)} className="rounded-full bg-surface-container px-5 py-2.5 font-semibold">Hủy</button>
            <button type="submit" disabled={isSubmitting || baseDraft === base} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-50">
              {isSubmitting && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}Lưu giá gốc
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toast} />
    </>
  );
};
