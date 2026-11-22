import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';

export const HotelPolicies: React.FC<{ policy?: string; checkIn?: string; checkOut?: string }> = ({ policy, checkIn, checkOut }) => {
  const { t } = useLanguage();
  return (
    <section className="grid gap-4 rounded-2xl bg-surface-container-lowest p-5 md:grid-cols-3">
      <article><h3 className="font-semibold">{t('detail.checkIn')}</h3><p>{checkIn || t('detail.contactHotel')}</p></article>
      <article><h3 className="font-semibold">{t('detail.checkOut')}</h3><p>{checkOut || t('detail.contactHotel')}</p></article>
      <article><h3 className="font-semibold">{t('detail.cancelPolicy')}</h3><p className="whitespace-pre-line">{policy || t('detail.noCancelPolicy')}</p></article>
    </section>
  );
};
export default HotelPolicies;
