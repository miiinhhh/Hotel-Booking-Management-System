import React, { useState } from 'react';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  durationNights?: number;
  onBookRoom?: (room: Room, selectedPackageId?: string, totalPrice?: number) => void;
  onViewRoomDetail?: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  durationNights = 3,
  onBookRoom,
  onViewRoomDetail,
}) => {
  // Determine initial selected package
  const defaultPackageId =
    room.packages?.find((p) => p.isRecommended)?.id || room.packages?.[0]?.id;
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(
    defaultPackageId
  );

  const selectedPackage = room.packages?.find((p) => p.id === selectedPackageId);
  const currentPricePerNight = selectedPackage
    ? selectedPackage.pricePerNight
    : room.allInclusiveDetail
    ? room.allInclusiveDetail.pricePerNight
    : 0;

  const totalPrice = currentPricePerNight * durationNights;

  const handleBook = () => {
    onBookRoom?.(room, selectedPackageId, totalPrice);
  };

  return (
    <article className="flex flex-col xl:flex-row w-full rounded-2xl bg-surface-container-lowest shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-surface-container/60">
      {/* Left Photo Column with Tag */}
      <div className="xl:w-80 shrink-0 relative p-3 flex flex-col justify-between">
        <div className="relative w-full h-64 xl:h-full rounded-xl overflow-hidden group">
          <img
            src={room.image}
            alt={room.imageAlt || room.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Remaining rooms badge */}
          <span
            className={`absolute top-3 left-3 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold tracking-wide shadow-sm ${
              room.remainingBadgeColor === 'error'
                ? 'bg-error text-on-error'
                : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            {room.remainingRooms === 1
              ? 'Chỉ còn 1 phòng cuối'
              : `Còn ${room.remainingRooms} phòng`}
          </span>

          {/* Zoom / View Detail Button */}
          <button
            type="button"
            onClick={() => onViewRoomDetail?.(room)}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-sm text-label-sm flex items-center gap-1 shadow hover:bg-surface-container-lowest transition-colors cursor-pointer border-0 active:scale-95"
          >
            <span className="material-symbols-outlined text-[15px]">zoom_in</span>
            <span>Xem chi tiết phòng</span>
          </button>
        </div>
      </div>

      {/* Middle Specs & Inclusions */}
      <div className="flex-1 p-space-md md:p-space-lg flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                room.tag === 'Biệt thự đắt giá nhất'
                  ? 'bg-primary-fixed text-on-primary-fixed'
                  : room.tag === 'Đặc quyền Hoàng Gia'
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-surface-container-high text-on-surface'
              }`}
            >
              {room.tag}
            </span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">
              • {room.floor}
            </span>
          </div>

          <h3 className="font-headline-sm text-headline-sm text-on-surface mt-1">
            {room.name}
          </h3>

          {/* Key Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 rounded-xl bg-surface-container-low">
            {room.specs.map((spec, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-on-surface font-body-md text-body-md"
              >
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  {spec.icon}
                </span>
                <span>{spec.text}</span>
              </div>
            ))}
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-2 text-on-surface-variant font-label-md text-label-md">
            {room.features.map((feat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container"
              >
                <span className="material-symbols-outlined text-primary text-[16px]">
                  {feat.icon}
                </span>{' '}
                {feat.text}
              </span>
            ))}
          </div>
        </div>

        {/* Package Tiers Selector (if multiple packages available) */}
        {room.packages && room.packages.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
              Tùy chọn gói phòng
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {room.packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <label
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-colors group border ${
                      isSelected
                        ? 'bg-primary-fixed/30 border-primary/30'
                        : 'bg-surface-container-low/70 hover:bg-surface-container-low border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pkg-${room.id}`}
                      checked={isSelected}
                      onChange={() => setSelectedPackageId(pkg.id)}
                      className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          {pkg.name}
                        </span>
                        {pkg.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <span className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                        {pkg.description}
                      </span>
                      <span
                        className={`font-label-md text-label-md font-semibold mt-1 ${
                          isSelected ? 'text-primary' : 'text-secondary'
                        }`}
                      >
                        {pkg.pricePerNight.toLocaleString('vi-VN')}₫ / đêm
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* All-Inclusive Package Detail (e.g. for Royal Villa) */}
        {room.allInclusiveDetail && (
          <div className="p-4 rounded-xl bg-surface-container-low/80 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-surface-container">
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg font-bold text-on-surface">
                {room.allInclusiveDetail.title}
              </span>
              <span className="font-body-md text-body-md text-on-surface-variant">
                {room.allInclusiveDetail.description}
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm text-primary font-bold shrink-0">
              {room.allInclusiveDetail.pricePerNight.toLocaleString('vi-VN')}₫{' '}
              <span className="font-body-md text-body-md text-on-surface-variant font-normal">
                / đêm
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Right Pricing & Booking Action Column */}
      <div className="xl:w-72 bg-surface-container-low/50 p-space-md md:p-space-lg flex flex-col justify-between items-start xl:items-end gap-4 shrink-0 border-t xl:border-t-0 xl:border-l border-surface-container/60">
        <div className="flex flex-col w-full xl:text-right">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Tổng cộng cho {durationNights} đêm
          </span>
          <div className="flex items-baseline justify-start xl:justify-end gap-1 mt-1">
            <span className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight">
              {totalPrice.toLocaleString('vi-VN')}₫
            </span>
          </div>
          <span className="font-body-md text-body-md text-on-surface-variant text-xs mt-0.5">
            Đã bao gồm thuế GTGT & phí dịch vụ
          </span>
          <span className="inline-flex items-center gap-1 text-tertiary font-label-sm text-label-sm mt-2 xl:self-end">
            <span className="material-symbols-outlined text-[15px]">
              check_circle
            </span>
            {room.cancellationPolicy}
          </span>
        </div>

        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={handleBook}
            className="w-full py-3.5 px-6 rounded-full bg-primary-container hover:bg-tertiary-container text-on-primary font-label-lg text-label-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer border-0"
          >
            <span>Đặt ngay</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
          {room.urgencyNote && (
            <span className="font-label-sm text-label-sm text-center text-on-surface-variant">
              {room.urgencyNote}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
export default RoomCard;
