import React from 'react';
import { LANGUAGES, Language, TranslationKey, useLanguage } from '../../i18n/LanguageContext';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const FOOTER_LINKS: { key: TranslationKey; path: string }[] = [
  { key: 'footer.terms', path: 'dieu-khoan' },
  { key: 'footer.privacy', path: 'chinh-sach-bao-mat' },
  { key: 'footer.help', path: 'tro-giup' },
  { key: 'footer.contact', path: 'lien-he' },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <footer className="w-full bg-surface-container-low mt-space-xl">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl flex flex-col lg:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm flex-wrap justify-center lg:justify-start">
          <span className="font-headline-sm text-headline-sm text-primary tracking-tight">StayLuxe</span>
          <span className="font-body-md text-body-md text-on-surface-variant">{t('footer.copyright')}</span>
        </div>

        {/* Chọn ngôn ngữ — dùng select gốc để danh sách hiển thị theo hệ điều hành */}
        <label className="relative inline-flex items-center">
          <span className="sr-only">{t('footer.language')}</span>
          <span className="material-symbols-outlined pointer-events-none absolute left-3 text-[18px] text-on-surface-variant">language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="h-9 cursor-pointer appearance-none rounded-full border border-outline-variant/60 bg-surface-container-lowest pl-9 pr-9 text-sm font-medium text-on-surface outline-none transition-colors hover:border-outline focus:ring-2 focus:ring-primary/30"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 text-[18px] text-on-surface-variant">expand_more</span>
        </label>

        <div className="flex items-center flex-wrap gap-space-md justify-center">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.path}
              className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
              data-path={link.path}
              href={`#${link.path}`}
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate(link.path);
              }}
            >
              {t(link.key)}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
export default Footer;
