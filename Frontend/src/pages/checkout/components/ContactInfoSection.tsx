import React from 'react';
import { CheckoutContactInfo } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ContactInfoSectionProps {
  contactInfo: CheckoutContactInfo;
  onChange: (info: CheckoutContactInfo) => void;
}

const INPUT = 'w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-full font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all pl-11';
const LABEL = 'font-label-md text-label-md uppercase tracking-wider text-on-surface-variant';

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({ contactInfo, onChange }) => {
  const { t } = useLanguage();
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center justify-between pb-space-xs">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">1</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('checkout.contactTitle')}</h2>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full">{t('checkout.required')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('checkout.fullName')}</span>
          <span className="relative">
            <input type="text" value={contactInfo.fullName} onChange={(e) => onChange({ ...contactInfo, fullName: e.target.value })}
              placeholder={t('checkout.fullNamePh')} className={INPUT} />
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t('checkout.phone')}</span>
          <span className="relative">
            <input type="tel" value={contactInfo.phone} onChange={(e) => onChange({ ...contactInfo, phone: e.target.value })}
              placeholder="+84 ..." className={INPUT} />
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">call</span>
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>{t('checkout.email')}</span>
        <span className="relative">
          <input type="email" value={contactInfo.email} onChange={(e) => onChange({ ...contactInfo, email: e.target.value })}
            placeholder="name@domain.com" className={INPUT} />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
        </span>
        <span className="font-body-md text-label-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
          <span className="material-symbols-outlined text-[15px] text-primary">info</span>{t('checkout.emailHint')}
        </span>
      </label>

      <div className="pt-space-xs">
        <label className="flex items-start gap-space-sm cursor-pointer select-none group">
          <input type="checkbox" checked={contactInfo.isBookingForOther}
            onChange={(e) => onChange({ ...contactInfo, isBookingForOther: e.target.checked })}
            className="mt-1 w-4 h-4 rounded accent-primary cursor-pointer" />
          <span className="flex flex-col">
            <span className="font-body-md text-body-md text-on-surface font-medium group-hover:text-primary transition-colors">{t('checkout.forOther')}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{t('checkout.forOtherHint')}</span>
          </span>
        </label>
        {contactInfo.isBookingForOther && (
          <div className="mt-3 pl-7">
            <input type="text" value={contactInfo.otherGuestName || ''} onChange={(e) => onChange({ ...contactInfo, otherGuestName: e.target.value })}
              placeholder={t('checkout.otherGuestPh')}
              className="w-full bg-surface-container-low text-on-surface px-4 py-2.5 rounded-full font-body-md text-sm focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
        )}
      </div>
    </section>
  );
};
export default ContactInfoSection;
