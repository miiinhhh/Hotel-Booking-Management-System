import React from 'react';
import { SpecialRequestOption } from '../types';
import { useLanguage, TranslationKey } from '../../../i18n/LanguageContext';

interface SpecialRequestsSectionProps {
  requests: SpecialRequestOption[];
  onToggleRequest: (id: string) => void;
  additionalNotes: string;
  onNotesChange: (notes: string) => void;
}

export const SpecialRequestsSection: React.FC<SpecialRequestsSectionProps> = ({ requests, onToggleRequest, additionalNotes, onNotesChange }) => {
  const { t } = useLanguage();
  return (
    <section className="bg-surface-container-lowest rounded-2xl p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center gap-space-sm pb-space-xs">
        <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold">2</span>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('checkout.requestsTitle')}</h2>
          <p className="text-xs text-on-surface-variant">{t('checkout.requestsHint')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {requests.map((item) => (
          <button key={item.id} type="button" aria-pressed={item.selected} onClick={() => onToggleRequest(item.id)}
            className={`px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer ${
              item.selected ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
            <span className="material-symbols-outlined text-[16px]">{item.selected ? 'check' : 'add'}</span>
            <span>{t(`checkout.req.${item.id}` as TranslationKey)}</span>
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 mt-1">
        <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{t('checkout.notes')}</span>
        <textarea value={additionalNotes} onChange={(e) => onNotesChange(e.target.value)} rows={3} placeholder={t('checkout.notesPh')}
          className="w-full bg-surface-container-low text-on-surface p-4 rounded-2xl font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none" />
      </label>
    </section>
  );
};
export default SpecialRequestsSection;
