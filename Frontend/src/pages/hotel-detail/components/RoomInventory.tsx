import React from 'react';
import { Room } from '../types';
import { RoomCard } from './RoomCard';

interface RoomInventoryProps {
  rooms: Room[];
  datesText?: string;
  durationNights?: number;
  guestsText?: string;
  onBookRoom?: (room: Room, packageId?: string, totalPrice?: number) => void;
  onViewRoomDetail?: (room: Room) => void;
}

export const RoomInventory: React.FC<RoomInventoryProps> = ({
  rooms,
  datesText = '15 Th04 – 18 Th04',
  durationNights = 3,
  guestsText = '2 người lớn',
  onBookRoom,
  onViewRoomDetail,
}) => {
  return (
    <section className="flex flex-col gap-space-md pt-2 scroll-mt-28" id="room-inventory">
      {/* Section Header with Selected Parameters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-surface-container">
        <div>
          <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-semibold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[18px]">
              calendar_month
            </span>
            <span>
              {datesText} · {durationNights} đêm, {guestsText}
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Các hạng phòng khả dụng
          </h2>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <span>Hiển thị giá:</span>
          <span className="font-semibold text-on-surface px-3 py-1 rounded-full bg-surface-container">
            Đã gồm Thuế & Phí dịch vụ (VND)
          </span>
        </div>
      </div>

      {/* Room Cards List */}
      <div className="flex flex-col gap-space-lg">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            durationNights={durationNights}
            onBookRoom={onBookRoom}
            onViewRoomDetail={onViewRoomDetail}
          />
        ))}
      </div>
    </section>
  );
};
export default RoomInventory;
