import React from 'react';
import { ResortAmenity } from '../types';

interface ResortAmenitiesProps {
  amenities: ResortAmenity[];
}

export const ResortAmenities: React.FC<ResortAmenitiesProps> = ({
  amenities,
}) => {
  return (
    <section className="flex flex-col gap-space-md bg-surface-container-low/70 rounded-2xl p-space-md md:p-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
            Trải nghiệm đỉnh cao
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mt-0.5">
            Tiện ích đặc quyền tại khu nghỉ dưỡng
          </h2>
        </div>
        <span className="font-body-md text-body-md text-on-surface-variant max-w-md">
          Mọi không gian được chăm chút tối giản tinh tế, hòa hợp giữa thiên
          nhiên nguyên sơ và dịch vụ đẳng cấp thế giới.
        </span>
      </div>

      {/* Amenity Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {amenities.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary transition-colors mb-2">
              <span className="material-symbols-outlined text-[24px]">
                {item.icon}
              </span>
            </div>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {item.title}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              {item.subtitle}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
export default ResortAmenities;
