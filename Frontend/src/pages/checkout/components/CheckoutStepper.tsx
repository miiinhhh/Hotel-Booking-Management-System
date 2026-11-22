import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';

interface CheckoutStepperProps {
  onBackToHotel?: () => void;
}

export const CheckoutStepper: React.FC<CheckoutStepperProps> = ({ onBackToHotel }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-space-xs">
      <div className="flex items-center gap-2 overflow-x-auto py-1 text-on-surface-variant font-label-md text-label-md">
        <button onClick={onBackToHotel} className="flex items-center gap-1 text-primary font-semibold hover:underline cursor-pointer">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {t('checkout.step1')}
        </button>
        <span className="material-symbols-outlined text-[14px] text-surface-dim">chevron_right</span>
        <span className="flex items-center gap-1 text-primary font-semibold">
          <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">2</span>
          {t('checkout.step2')}
        </span>
        <span className="material-symbols-outlined text-[14px] text-surface-dim">chevron_right</span>
        <span className="text-on-surface-variant/60 flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] flex items-center justify-center font-bold">3</span>
          {t('checkout.step3')}
        </span>
      </div>

      <div className="mt-2">
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{t('checkout.title')}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">{t('checkout.subtitle')}</p>
      </div>
    </div>
  );
};
export default CheckoutStepper;
