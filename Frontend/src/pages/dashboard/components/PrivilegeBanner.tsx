import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage, TranslationKey } from '../../../i18n/LanguageContext';

interface PrivilegeBannerProps {
  onRegister?: () => void;
  onLogin?: () => void;
}

// Chỉ liệt kê tính năng có thật khi khách có tài khoản.
const BENEFITS: { icon: string; text: TranslationKey }[] = [
  { icon: 'favorite', text: 'member.benefit1' },
  { icon: 'event_available', text: 'member.benefit2' },
  { icon: 'rate_review', text: 'member.benefit3' },
];

/** Lời mời tạo tài khoản; ẩn khi khách đã đăng nhập. */
export const PrivilegeBanner: React.FC<PrivilegeBannerProps> = ({ onRegister, onLogin }) => {
  const { session } = useAuth();
  const { t } = useLanguage();
  if (session || !onRegister) return null;

  return (
    <section className="mx-auto mb-16 mt-12 w-full max-w-[1440px] px-5">
      <div className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-2xl bg-surface-container-high p-8 md:flex-row md:items-center md:p-12">
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-primary-fixed/30 blur-2xl" />

        <div className="relative z-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t('member.eyebrow')}</span>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">{t('member.title')}</h3>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {BENEFITS.map(b => (
              <li key={b.text} className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary">{b.icon}</span>{t(b.text)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-center">
          <button type="button" onClick={onRegister}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container">
            <span className="material-symbols-outlined text-[20px]">person_add</span>{t('member.register')}
          </button>
          {onLogin && (
            <p className="text-center text-sm text-on-surface-variant">
              {t('member.haveAccount')} <button type="button" onClick={onLogin} className="font-semibold text-primary hover:underline">{t('member.login')}</button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
export default PrivilegeBanner;
