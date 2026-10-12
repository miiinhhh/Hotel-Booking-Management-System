import React from 'react';

interface StickyActionBarProps {
  checkInTime?: string;
  checkOutTime?: string;
  cancelPolicySummary?: string;
  datesText?: string;
  onSelectRoomClick?: () => void;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  checkInTime = '14:00',
  checkOutTime = '12:00',
  cancelPolicySummary = 'Hủy phòng miễn phí trước 24h',
  datesText = '15/04 — 18/04 · 3 đêm',
  onSelectRoomClick,
}) => {
  const scrollToRoomInventory = () => {
    if (onSelectRoomClick) {
      onSelectRoomClick();
      return;
    }
    const elem = document.getElementById('room-inventory');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="sticky top-20 z-40 w-full rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl shadow-md p-3 md:p-4 transition-all border border-surface-container/60">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Badges Info */}
        <div className="flex items-center flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low text-on-surface">
            <span className="material-symbols-outlined text-primary text-[18px]">
              hotel_class
            </span>
            <span className="font-label-md text-label-md font-semibold">
              Nhận phòng: {checkInTime}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low text-on-surface">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              schedule
            </span>
            <span className="font-label-md text-label-md font-semibold">
              Trả phòng: {checkOutTime}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low text-on-surface">
            <span className="material-symbols-outlined text-primary text-[18px]">
              verified_user
            </span>
            <span className="font-label-md text-label-md font-semibold">
              {cancelPolicySummary}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed">
            <span className="material-symbols-outlined text-primary-container text-[18px]">
              beach_access
            </span>
            <span className="font-label-md text-label-md font-semibold">
              Bãi biển biệt lập
            </span>
          </div>
        </div>

        {/* Date and CTA */}
        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-4">
          <div className="text-left lg:text-right">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant block tracking-wider">
              Thời gian lưu trú
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-bold">
              {datesText}
            </span>
          </div>

          <button
            type="button"
            onClick={scrollToRoomInventory}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary-container hover:bg-tertiary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer border-0"
          >
            <span>Chọn phòng</span>
            <span className="material-symbols-outlined text-[18px]">
              arrow_downward
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
export default StickyActionBar;
