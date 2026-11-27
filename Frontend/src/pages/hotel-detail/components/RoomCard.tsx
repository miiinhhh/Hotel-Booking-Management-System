import React, { useState } from 'react';
import { Room } from '../types';
import { useLanguage, formatMoney } from '../../../i18n/LanguageContext';

interface RoomCardProps {
  room: Room;
  durationNights?: number;
  onBookRoom?: (room: Room, selectedPackageId?: string, totalPrice?: number) => void;
  onViewRoomDetail?: (room: Room) => void;
}

const MAX_FEATURES = 6;

/** Thẻ phòng: ảnh · tên, tầng, sức chứa, tiện ích · giá/đêm, tổng tiền và nút đặt. */
export const RoomCard: React.FC<RoomCardProps> = ({ room, durationNights = 1, onBookRoom, onViewRoomDetail }) => {
  const { t, locale } = useLanguage();
  const defaultPackageId = room.packages?.find((p) => p.isRecommended)?.id || room.packages?.[0]?.id;
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(defaultPackageId);
  const selectedPackage = room.packages?.find((p) => p.id === selectedPackageId);
  const pricePerNight = selectedPackage?.pricePerNight ?? room.allInclusiveDetail?.pricePerNight ?? 0;
  // Chọn số phòng cùng hạng (tối đa số phòng còn trống, không quá 5 phòng/đơn).
  const maxQuantity = Math.max(1, Math.min(room.remainingRooms || 1, 5));
  const [quantity, setQuantity] = useState(1);
  const totalPrice = pricePerNight * durationNights * quantity;
  const extraFeatures = Math.max(0, room.features.length - MAX_FEATURES);
  const multiplePackages = (room.packages?.length ?? 0) > 1;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm md:flex-row">
      {/* Ảnh */}
      <button type="button" onClick={() => onViewRoomDetail?.(room)} className="group relative aspect-[16/10] shrink-0 overflow-hidden bg-surface-container md:aspect-auto md:w-60">
        <img src={room.image} alt={room.imageAlt || room.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/95 px-3 py-1 text-xs font-semibold text-on-surface shadow-sm">
          <span className="material-symbols-outlined text-[15px]">zoom_in</span>{t('rooms.viewDetail')}
        </span>
      </button>

      {/* Thông tin */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold text-on-surface">{room.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant">
            {room.floor && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">stairs</span>{room.floor}</span>}
            {room.specs.map((spec) => (
              <span key={spec.text} className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">{spec.icon}</span>{spec.text}</span>
            ))}
          </p>
        </div>

        {room.features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {room.features.slice(0, MAX_FEATURES).map((feat) => (
              <li key={feat.text} className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-primary">check</span>{feat.text}
              </li>
            ))}
            {extraFeatures > 0 && (
              <li><button type="button" onClick={() => onViewRoomDetail?.(room)} className="rounded-full px-2.5 py-1 text-xs font-semibold text-primary hover:underline">+{extraFeatures}</button></li>
            )}
          </ul>
        )}

        {multiplePackages && (
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('rooms.packages')}</legend>
            {room.packages!.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <label key={pkg.id} className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 text-sm ${isSelected ? 'border-primary/40 bg-primary-fixed/30' : 'border-outline-variant/40 hover:bg-surface-container-low'}`}>
                  <input type="radio" name={`pkg-${room.id}`} checked={isSelected} onChange={() => setSelectedPackageId(pkg.id)} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-on-surface">{pkg.name}</span>
                    <span className="block text-xs text-on-surface-variant">{pkg.description}</span>
                    <span className="mt-1 block font-semibold text-primary">{t('rooms.priceNight', { price: formatMoney(pkg.pricePerNight, locale) })}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        <p className="mt-auto flex items-start gap-1.5 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
          <span className="line-clamp-2">{room.cancellationPolicy || t('rooms.policyFallback')}</span>
        </p>
      </div>

      {/* Giá & đặt */}
      <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-low/40 p-5 md:w-56 md:flex-col md:items-stretch md:justify-end md:border-l md:border-t-0">
        <div className="md:text-right">
          <p className="text-sm text-on-surface-variant">{t('rooms.priceNight', { price: formatMoney(pricePerNight, locale) })}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{quantity > 1 ? t('rooms.totalForRooms', { count: durationNights, rooms: quantity }) : t('rooms.totalFor', { count: durationNights })}</p>
          <p className="text-2xl font-bold tracking-tight text-on-surface">{formatMoney(totalPrice, locale)}</p>
          <p className="text-[11px] text-on-surface-variant">{t('rooms.indicative')}</p>
        </div>
        {maxQuantity > 1 && (
          <label className="flex items-center justify-between gap-2 text-sm text-on-surface-variant md:justify-end">
            {t('rooms.quantity')}
            <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} aria-label={t('rooms.quantity')}
              className="h-9 rounded-full border border-outline-variant/60 bg-surface-container-lowest px-3 font-semibold text-on-surface">
              {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <button type="button" onClick={() => onBookRoom?.({ ...room, quantity }, selectedPackageId, totalPrice)}
          className="inline-flex items-center justify-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90">
          {t('rooms.chooseAndBook')}<span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </article>
  );
};
export default RoomCard;
