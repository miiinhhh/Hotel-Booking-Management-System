import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';

/** Giải thích đúng quy trình hoàn tiền hiện có: theo chính sách hủy, nhân viên xử lý thủ công. */
export const AssuranceBanner: React.FC = () => {
  const { t } = useLanguage();
  return (
  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 md:flex-row md:items-center">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-primary">
        <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
      </span>
      <div>
        <p className="font-semibold text-on-surface">{t('assurance.title')}</p>
        <p className="mt-0.5 text-sm text-on-surface-variant">{t('assurance.body')}</p>
      </div>
    </div>
    <a href="#dieu-khoan" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
      {t('assurance.link')}<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </a>
  </div>
  );
};
export default AssuranceBanner;
