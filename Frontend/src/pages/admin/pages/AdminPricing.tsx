import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageHeading, Toast } from '../components/AdminUi';
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

export const AdminPricing: React.FC = () => {
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number>(1);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number>(0);
  const [priceHistories, setPriceHistories] = useState<RoomPriceHistoryDto[]>([]);

  const [basePrice, setBasePrice] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [effectiveTo, setEffectiveTo] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [historiesLoading, setHistoriesLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' ₫';
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  // 1. Tải danh sách khách sạn
  useEffect(() => {
    let active = true;
    const fetchHotels = async () => {
      try {
        const res = await getHotelsList();
        if (active && res.success && res.data?.items?.length) {
          setHotels(res.data.items);
          setSelectedHotelId(res.data.items[0].hotelId);
        } else if (active) {
          // Fallback mặc định HotelId = 1 nếu danh sách rỗng
          setHotels([{ hotelId: 1, hotelName: 'Khách sạn StayLuxe Chính' }]);
          setSelectedHotelId(1);
        }
      } catch {
        if (active) {
          setHotels([{ hotelId: 1, hotelName: 'Khách sạn StayLuxe' }]);
          setSelectedHotelId(1);
        }
      }
    };
    fetchHotels();
    return () => {
      active = false;
    };
  }, []);

  // 2. Tải danh sách hạng phòng theo khách sạn đã chọn
  useEffect(() => {
    if (!selectedHotelId) return;
    let active = true;
    const fetchTypes = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getRoomTypesByHotel(selectedHotelId);
        if (!active) return;
        if (res.success && res.data) {
          setRoomTypes(res.data);
          if (res.data.length > 0) {
            setSelectedRoomTypeId(res.data[0].roomTypeId);
            setBasePrice(res.data[0].basePrice);
          } else {
            setSelectedRoomTypeId(0);
            setBasePrice(0);
          }
        } else {
          setError(res.message || 'Không thể tải danh sách hạng phòng.');
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tải hạng phòng.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTypes();
    return () => {
      active = false;
    };
  }, [selectedHotelId]);

  // 3. Tải lịch sử giá RoomPriceHistory khi chọn hạng phòng
  useEffect(() => {
    if (!selectedHotelId || !selectedRoomTypeId) {
      setPriceHistories([]);
      return;
    }
    let active = true;
    const fetchHistories = async () => {
      setHistoriesLoading(true);
      try {
        const res = await getRoomPriceHistories(selectedHotelId, selectedRoomTypeId);
        if (active && res.success && res.data) {
          setPriceHistories(res.data);
        } else if (active) {
          setPriceHistories([]);
        }
      } catch {
        if (active) setPriceHistories([]);
      } finally {
        if (active) setHistoriesLoading(false);
      }
    };
    fetchHistories();
    return () => {
      active = false;
    };
  }, [selectedHotelId, selectedRoomTypeId]);

  const selectedRoom = useMemo(
    () => roomTypes.find((r) => r.roomTypeId === selectedRoomTypeId) || null,
    [roomTypes, selectedRoomTypeId]
  );

  const chooseRoom = (typeId: number) => {
    const room = roomTypes.find((item) => item.roomTypeId === typeId);
    if (!room) return;
    setSelectedRoomTypeId(typeId);
    setBasePrice(room.basePrice);
  };

  // Thao tác 1: Tạo cấu hình giá mới theo thời gian (RoomPriceHistory)
  const savePriceHistory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoom) {
      setError('Vui lòng chọn hạng phòng trước.');
      return;
    }
    if (basePrice < 0) {
      setError('Giá phòng phải lớn hơn hoặc bằng 0.');
      return;
    }
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      setError('Ngày kết thúc phải lớn hơn ngày bắt đầu áp dụng.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createRoomPriceHistory(selectedHotelId, selectedRoom.roomTypeId, {
        price: basePrice,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      });

      if (res.success && res.data) {
        showToast(`Đã lưu cấu hình giá mới cho ${selectedRoom.name} thành công.`);
        // Reload lịch sử giá từ server
        const updatedHistories = await getRoomPriceHistories(selectedHotelId, selectedRoom.roomTypeId);
        if (updatedHistories.success && updatedHistories.data) {
          setPriceHistories(updatedHistories.data);
        }
      } else {
        setError(res.message || 'Không thể lưu cấu hình giá.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi lưu cấu hình giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thao tác 2: Cập nhật trực tiếp giá cơ sở mặc định (BasePrice)
  const handleUpdatePermanentBasePrice = async () => {
    if (!selectedRoom) return;
    if (basePrice < 0) {
      setError('Giá phòng không hợp lệ.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await updateRoomTypeBasePrice(selectedHotelId, selectedRoom.roomTypeId, {
        name: selectedRoom.name,
        description: selectedRoom.description,
        basePrice,
        capacity: selectedRoom.capacity,
        numberOfBeds: selectedRoom.numberOfBeds,
      });

      if (res.success && res.data) {
        showToast(`Đã cập nhật giá bán cơ sở mặc định cho ${selectedRoom.name}.`);
        // Cập nhật lại state roomTypes
        setRoomTypes((prev) =>
          prev.map((r) =>
            r.roomTypeId === selectedRoom.roomTypeId ? { ...r, basePrice: res.data!.basePrice } : r
          )
        );
      } else {
        setError(res.message || 'Không thể cập nhật giá cơ sở.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi cập nhật giá cơ sở.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const originalPrice = selectedRoom?.basePrice || 0;
  const difference = basePrice - originalPrice;
  const differencePercent = originalPrice ? Math.round((difference / originalPrice) * 100) : 0;

  return (
    <>
      <PageHeading
        title="Cấu hình Giá phòng & Lịch sử Giá"
        description="Quản lý giá cơ sở và thời gian hiệu lực theo dữ liệu RoomTypes và RoomPriceHistory từ máy chủ."
      />

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-error-container p-4 text-on-error-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">error</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold uppercase tracking-wider hover:opacity-80"
          >
            Đóng
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg bg-surface-container-lowest shadow-sm">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <p className="text-sm text-outline">Đang tải danh sách hạng phòng từ cơ sở dữ liệu...</p>
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="rounded-lg bg-surface-container-lowest p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-outline">hotel</span>
          <h3 className="mt-3 text-lg font-bold">Chưa có hạng phòng nào</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Khách sạn này chưa có dữ liệu loại phòng trong hệ thống.
          </p>
        </div>
      ) : (
        <form onSubmit={savePriceHistory} className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          <div className="space-y-6">
            {/* Bộ chọn Khách sạn và Hạng phòng */}
            <section className="grid gap-3 rounded-lg bg-surface-container-low p-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase text-outline">
                Khách sạn
                <select
                  value={selectedHotelId}
                  onChange={(e) => setSelectedHotelId(Number(e.target.value))}
                  className="mt-1 block h-11 w-full rounded-lg bg-white px-4 text-sm normal-case text-on-surface outline-none"
                >
                  {hotels.map((h) => (
                    <option key={h.hotelId} value={h.hotelId}>
                      {h.hotelName} (ID: {h.hotelId})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase text-outline">
                Hạng phòng
                <select
                  value={selectedRoomTypeId}
                  onChange={(event) => chooseRoom(Number(event.target.value))}
                  className="mt-1 block h-11 w-full rounded-lg bg-white px-4 text-sm normal-case text-on-surface outline-none"
                >
                  {roomTypes.map((room) => (
                    <option key={room.roomTypeId} value={room.roomTypeId}>
                      {room.name} — Giá gốc: {formatCurrency(room.basePrice)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {/* Chi tiết Giá bán */}
            <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">Giá bán cơ sở</p>
                  <h2 className="mt-1 font-headline-sm text-xl font-semibold">
                    {selectedRoom?.name || 'Chưa chọn'}
                  </h2>
                  <p className="text-sm text-outline">
                    Sức chứa: {selectedRoom?.capacity || 0} người · Số giường:{' '}
                    {selectedRoom?.numberOfBeds || 0}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedRoom?.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {selectedRoom?.isActive ? 'Đang mở bán' : 'Tạm dừng'}
                </span>
              </div>

              <div className="rounded-lg bg-primary-fixed/25 p-6">
                <label className="text-xs font-semibold uppercase text-on-surface-variant">
                  Giá mỗi đêm (VNĐ)
                </label>
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
                <div className="mt-3 flex items-center justify-between text-sm text-on-surface-variant">
                  <span>
                    Giá gốc hiện tại trong CSDL:{' '}
                    <strong>{formatCurrency(selectedRoom?.basePrice || 0)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleUpdatePermanentBasePrice}
                    disabled={isSubmitting}
                    className="text-xs font-bold text-primary underline hover:opacity-80"
                  >
                    Cập nhật làm giá gốc vĩnh viễn (RoomTypes.BasePrice)
                  </button>
                </div>
              </div>
            </section>

            {/* Thời gian áp dụng cấu hình giá (RoomPriceHistory) */}
            <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase text-primary">
                  Cấu hình giá theo khoảng thời gian
                </p>
                <h2 className="mt-1 font-headline-sm text-xl font-semibold">Hiệu lực của mức giá</h2>
                <p className="text-sm text-outline">
                  Tương ứng với bản ghi EffectiveFrom và EffectiveTo trong RoomPriceHistory.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Bắt đầu áp dụng
                  <input
                    required
                    type="date"
                    value={effectiveFrom}
                    onChange={(event) => setEffectiveFrom(event.target.value)}
                    className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Kết thúc (không bắt buộc)
                  <input
                    type="date"
                    min={effectiveFrom}
                    value={effectiveTo}
                    onChange={(event) => setEffectiveTo(event.target.value)}
                    className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </section>

            {/* BẢNG LỊCH SỬ THAY ĐỔI GIÁ (RoomPriceHistory từ Database) */}
            <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-headline-sm text-lg font-semibold">
                    Lịch sử cấu hình giá ({selectedRoom?.name})
                  </h3>
                  <p className="text-xs text-outline">
                    Dữ liệu thực tế từ bảng RoomPriceHistory trong cơ sở dữ liệu SQL Server.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedHotelId && selectedRoomTypeId) {
                      setHistoriesLoading(true);
                      const res = await getRoomPriceHistories(selectedHotelId, selectedRoomTypeId);
                      if (res.success && res.data) setPriceHistories(res.data);
                      setHistoriesLoading(false);
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Làm mới
                </button>
              </div>

              {historiesLoading ? (
                <div className="py-6 text-center text-sm text-outline">
                  <span className="material-symbols-outlined animate-spin align-middle mr-2">
                    progress_activity
                  </span>
                  Đang tải lịch sử giá...
                </div>
              ) : priceHistories.length === 0 ? (
                <div className="rounded-lg bg-surface-container-low/50 py-8 text-center text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl text-outline mb-1 block">
                    schedule
                  </span>
                  Chưa có cấu hình giá đặc biệt nào. Giá mặc định đang áp dụng là BasePrice (
                  {formatCurrency(selectedRoom?.basePrice || 0)}).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-surface-container text-xs uppercase text-outline">
                        <th className="pb-3 font-semibold">ID</th>
                        <th className="pb-3 font-semibold">Mức giá</th>
                        <th className="pb-3 font-semibold">Hiệu lực từ</th>
                        <th className="pb-3 font-semibold">Hiệu lực đến</th>
                        <th className="pb-3 font-semibold">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {priceHistories.map((h) => (
                        <tr key={h.priceHistoryId} className="hover:bg-surface-container-low/40">
                          <td className="py-3 font-mono text-xs text-outline">#{h.priceHistoryId}</td>
                          <td className="py-3 font-bold text-primary">{formatCurrency(h.price)}</td>
                          <td className="py-3">
                            {new Date(h.effectiveFrom).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3">
                            {h.effectiveTo
                              ? new Date(h.effectiveTo).toLocaleDateString('vi-VN')
                              : 'Vô thời hạn'}
                          </td>
                          <td className="py-3 text-xs text-outline">
                            {new Date(h.createdAt).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Cột Xem trước & Nút Lưu */}
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <article className="overflow-hidden rounded-lg bg-inverse-surface text-inverse-on-surface shadow-xl">
              <div className="h-40 w-full bg-gradient-to-br from-primary/80 to-surface-tint flex items-center justify-center p-6 text-center">
                <div>
                  <span className="material-symbols-outlined text-4xl text-white mb-2">hotel</span>
                  <h3 className="text-xl font-bold text-white">{selectedRoom?.name || 'Hạng phòng'}</h3>
                  <p className="text-xs text-white/80">Khách sạn ID: {selectedHotelId}</p>
                </div>
              </div>
              <div className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase text-white/60">Xem trước giá bán</p>
                  <h2 className="mt-2 font-headline-sm text-xl font-semibold text-white">
                    {selectedRoom?.name}
                  </h2>
                </div>
                <div>
                  <p className="text-sm text-white/60">Giá cấu hình mới</p>
                  <p className="mt-1 font-headline-md text-3xl font-semibold text-secondary-fixed">
                    {formatCurrency(basePrice)}
                  </p>
                </div>
                <div className="border-t border-white/20 pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">So với giá gốc</span>
                    <strong
                      className={difference >= 0 ? 'text-secondary-fixed' : 'text-emerald-300'}
                    >
                      {difference >= 0 ? '+' : ''}
                      {formatCurrency(difference)} ({differencePercent >= 0 ? '+' : ''}
                      {differencePercent}%)
                    </strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-3">
                    <span className="text-white/60">Hiệu lực từ</span>
                    <strong>{effectiveFrom || 'Chưa chọn'}</strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-3">
                    <span className="text-white/60">Hiệu lực đến</span>
                    <strong>{effectiveTo || 'Không giới hạn'}</strong>
                  </div>
                </div>
              </div>
            </article>

            <button
              type="submit"
              disabled={isSubmitting || !selectedRoom}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary shadow-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">
                    progress_activity
                  </span>
                  Đang lưu cấu hình giá...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Thêm vào RoomPriceHistory
                </>
              )}
            </button>
          </aside>
        </form>
      )}

      <Toast message={toast} />
    </>
  );
};
