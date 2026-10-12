import React from 'react';
import { Room } from '../types';

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onSelectBook: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onSelectBook,
}) => {
  if (!room) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-surface-container flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative h-64 md:h-72 w-full overflow-hidden shrink-0">
          <img
            src={room.image}
            alt={room.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors border-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="absolute bottom-3 left-4">
            <span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 text-on-surface font-label-sm text-label-sm font-semibold shadow-sm">
              {room.tag} • {room.floor}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {room.name}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Trải nghiệm nghỉ dưỡng đẳng cấp với không gian thiết kế độc bản,
              view ngoạn mục và các trang thiết bị nội thất sang trọng.
            </p>
          </div>

          {/* Specs */}
          <div>
            <h4 className="font-label-md text-label-md uppercase text-outline font-semibold mb-2">
              Thông số phòng
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-container-low">
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
          </div>

          {/* Features */}
          <div>
            <h4 className="font-label-md text-label-md uppercase text-outline font-semibold mb-2">
              Tiện nghi & Dịch vụ nổi bật
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {room.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-on-surface font-body-md text-body-md p-2 rounded-lg bg-surface-container-low/50"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {feat.icon}
                  </span>
                  <span>{feat.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cancellation */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low text-tertiary font-label-md text-label-md">
            <span className="material-symbols-outlined text-[18px]">
              verified_user
            </span>
            <span>{room.cancellationPolicy}</span>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold cursor-pointer border-0"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectBook(room);
              }}
              className="px-6 py-2.5 rounded-full bg-primary-container hover:bg-tertiary-container text-on-primary font-label-md text-label-md font-semibold cursor-pointer border-0 shadow-sm"
            >
              Đặt hạng phòng này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RoomDetailModal;
