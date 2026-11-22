import React from 'react';
import { ResortAmenity } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ResortAmenitiesProps {
  amenities: ResortAmenity[];
}

/** Danh sách tiện ích dạng lưới gọn: icon + tên (+ mô tả nếu có). */
export const ResortAmenities: React.FC<ResortAmenitiesProps> = ({ amenities }) => {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="amenities-title">
      <h2 id="amenities-title" className="text-2xl font-semibold text-on-surface">{t('detail.amenitiesTitle')}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{t('detail.amenitiesIntro')}</p>
      {amenities.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant">{t('detail.noAmenities')}</p>
      ) : (
        <ul className="mt-4 grid gap-x-6 gap-y-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((item) => (
            <li key={item.title} className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-primary">check_circle</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-on-surface">{item.title}</span>
                {item.subtitle && <span className="block text-xs text-on-surface-variant">{item.subtitle}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
export default ResortAmenities;
