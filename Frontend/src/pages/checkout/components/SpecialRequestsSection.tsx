import React from 'react';
import { SpecialRequestOption } from '../types';

interface SpecialRequestsSectionProps {
  requests: SpecialRequestOption[];
  onToggleRequest: (id: string) => void;
  additionalNotes: string;
  onNotesChange: (notes: string) => void;
}

export const SpecialRequestsSection: React.FC<SpecialRequestsSectionProps> = ({
  requests,
  onToggleRequest,
  additionalNotes,
  onNotesChange,
}) => {
  return (
    <section className="bg-surface-container-lowest rounded-lg p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center gap-space-sm pb-space-xs">
        <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-headline-sm text-headline-sm flex items-center justify-center text-xs">
          2
        </span>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Yêu cầu đặc biệt
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant text-xs">
            StayLuxe sẽ gửi thông báo trực tiếp đến bộ phận Quản gia của Resort.
          </p>
        </div>
      </div>

      {/* Interactive Request Pills */}
      <div className="flex flex-wrap gap-2.5" id="request-tags-container">
        {requests.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggleRequest(item.id)}
            className={`px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer ${
              item.selected
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {item.selected ? 'check' : 'add'}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Ghi chú bổ sung (nếu có)
        </label>
        <textarea
          value={additionalNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Vd: Chuẩn bị nôi trẻ em, chế độ ăn chay, dịch vụ đón tiễn sân bay quốc tế..."
          className="w-full bg-surface-container-low text-on-surface p-4 rounded-lg font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
        />
      </div>
    </section>
  );
};
