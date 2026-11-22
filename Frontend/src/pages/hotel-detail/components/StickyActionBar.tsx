import React, { useEffect, useState } from 'react';
import { useLanguage, formatMoney, TranslationKey } from '../../../i18n/LanguageContext';

interface StickyActionBarProps {
  /** Cuộn tới mục theo id. */
  onJump: (id: string) => void;
  minPrice?: number;
}

const TABS: { id: string; key: TranslationKey }[] = [
  { id: 'overview', key: 'detail.tabOverview' },
  { id: 'rooms', key: 'detail.tabRooms' },
  { id: 'amenities', key: 'detail.tabAmenities' },
  { id: 'reviews', key: 'detail.tabReviews' },
  { id: 'policies', key: 'detail.tabPolicies' },
];

/** Thanh mục dính dưới header: chuyển nhanh giữa các phần + giá thấp nhất và nút chọn phòng. */
export const StickyActionBar: React.FC<StickyActionBarProps> = ({ onJump, minPrice = 0 }) => {
  const { t, locale } = useLanguage();
  const [active, setActive] = useState('overview');

  // Tô sáng mục đang xem khi cuộn.
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-160px 0px -55% 0px' });
    TABS.forEach(tab => { const el = document.getElementById(tab.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-20 z-30 -mx-5 border-b border-outline-variant/40 bg-background/95 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {TABS.map(tab => (
            <button key={tab.id} type="button" onClick={() => { setActive(tab.id); onJump(tab.id); }}
              aria-current={active === tab.id ? 'true' : undefined}
              className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors ${active === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              {t(tab.key)}
            </button>
          ))}
        </div>
        {minPrice > 0 && (
          <span className="hidden text-sm text-on-surface-variant md:block">
            {t('detail.priceFrom')} <strong className="text-base text-on-surface">{formatMoney(minPrice, locale)}</strong>
          </span>
        )}
        <button type="button" onClick={() => onJump('rooms')}
          className="hidden shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:opacity-90 sm:block">
          {t('detail.chooseRoom')}
        </button>
      </div>
    </nav>
  );
};
export default StickyActionBar;
