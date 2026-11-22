import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';

export const HotelPolicies: React.FC<{ policy?: string; checkIn?: string; checkOut?: string }> = ({ policy, checkIn, checkOut }) => {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="policies-title">
      <h2 id="policies-title" className="text-2xl font-semibold text-on-surface">{t('detail.tabPolicies')}</h2>
      <div className="mt-4 grid gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm md:grid-cols-3">
      <article><h3 className="text-sm font-semibold text-on-surface-variant">{t('detail.checkIn')}</h3><p>{checkIn || t('detail.contactHotel')}</p></article>
      <article><h3 className="text-sm font-semibold text-on-surface-variant">{t('detail.checkOut')}</h3><p>{checkOut || t('detail.contactHotel')}</p></article>
      <article><h3 className="text-sm font-semibold text-on-surface-variant">{t('detail.cancelPolicy')}</h3><p className="whitespace-pre-line">{policy || t('detail.noCancelPolicy')}</p></article>
      </div>
    </section>
  );
};
export default HotelPolicies;
