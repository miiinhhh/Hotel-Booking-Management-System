import React, { useEffect, useState } from 'react';
import { offerApi, PublicVoucher } from '../../services/offerApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, TranslationKey } from '../../i18n/LanguageContext';

interface OffersPageProps {
  onNavigateSearch?: () => void;
  onNavigateHome?: () => void;
}

const img = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&fm=jpg&fit=crop`;
const HERO = img('1520250497591-112f2f40a3f4', 1800);
// Ảnh minh họa xoay vòng cho từng thẻ ưu đãi (Unsplash License).
const CARD_IMAGES = [
  '1566073771259-6a8506099945', '1582719508461-905c673771fd', '1540541338287-41700207dee6',
  '1611892440504-42a792e24d32', '1568084680786-a84f91d1153c', '1590490360182-c33d57733427',
];

type T = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** 500000 → "500K", 1500000 → "1,5 triệu" / "1.5M". */
const shortMoney = (value: number, t: T, locale: string) => {
  if (value >= 1_000_000) return t('offers.millions', { value: (value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 }) });
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value} ₫`;
};
const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const badge = (v: PublicVoucher, t: T, locale: string) => (v.voucherType === 'Percentage' ? `-${v.discountValue}%` : `-${shortMoney(v.discountValue, t, locale)}`);
const title = (v: PublicVoucher, t: T, locale: string) => v.voucherType === 'Percentage'
  ? t('offers.titlePercent', { value: v.discountValue })
  : t('offers.titleAmount', { value: shortMoney(v.discountValue, t, locale) });
const subtitle = (v: PublicVoucher, t: T, locale: string) => {
  const parts: string[] = [];
  if (v.voucherType === 'Percentage' && v.maxDiscountAmount != null) parts.push(t('offers.maxDiscount', { value: shortMoney(v.maxDiscountAmount, t, locale) }));
  parts.push(v.minimumOrderAmount > 0 ? t('offers.minOrder', { value: shortMoney(v.minimumOrderAmount, t, locale) }) : t('offers.anyOrder'));
  const text = parts.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const period = (v: PublicVoucher, t: T, locale: string) => {
  const left = daysLeft(v.endAt);
  if (left <= 1) return { text: t('offers.expiresToday'), urgent: true };
  if (left <= 7) return { text: t('offers.daysLeft', { count: left }), urgent: true };
  return { text: t('offers.until', { date: new Date(v.endAt).toLocaleDateString(locale) }), urgent: false };
};

const STEPS: { icon: string; title: TranslationKey; text: TranslationKey }[] = [
  { icon: 'content_copy', title: 'offers.step1Title', text: 'offers.step1Text' },
  { icon: 'travel_explore', title: 'offers.step2Title', text: 'offers.step2Text' },
  { icon: 'redeem', title: 'offers.step3Title', text: 'offers.step3Text' },
];

export const OffersPage: React.FC<OffersPageProps> = ({ onNavigateSearch, onNavigateHome }) => {
  const { session } = useAuth();
  const { t, locale } = useLanguage();
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setFailed(false);
    offerApi.available()
      .then(list => { if (alive) setVouchers(list); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session?.userId]);

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch { /* trình duyệt chặn: mã vẫn hiển thị để khách tự chép */ }
    setCopied(code);
    window.setTimeout(() => setCopied(current => (current === code ? null : current)), 2000);
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* HERO ẢNH LỚN */}
      <section className="relative flex min-h-[340px] items-end overflow-hidden pt-24 md:min-h-[400px]">
        <img src={HERO} alt={t('offers.heroAlt')} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        <div className="relative mx-auto w-full max-w-[1200px] px-5 pb-10 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <span className="material-symbols-outlined text-[16px]">local_offer</span>{t('offers.eyebrow')}
          </span>
          <h1 className="mt-3 max-w-2xl font-display-hero text-[34px] font-bold leading-tight md:text-display-hero">{t('offers.title')}</h1>
          <p className="mt-2 max-w-xl font-body-lg text-body-lg text-white/85">
            {loading ? t('offers.loading') : vouchers.length ? t('offers.count', { count: vouchers.length }) : t('offers.none')}
          </p>
        </div>
      </section>

      {/* DANH SÁCH ƯU ĐÃI */}
      <section className="mx-auto max-w-[1200px] px-5 pt-10">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('offers.listTitle')}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t('offers.listHint')}</p>

        {loading ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="h-[360px] animate-pulse rounded-[1.5rem] bg-surface-container" />)}
          </div>
        ) : failed || !vouchers.length ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-[1.5rem] bg-surface-container-lowest px-6 py-16 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-primary">featured_seasonal_and_gifts</span>
            <p className="font-headline-sm text-lg text-on-surface">{failed ? t('offers.loadFailed') : t('offers.empty')}</p>
            <p className="max-w-sm text-sm text-on-surface-variant">{t('offers.emptyHint')}</p>
            {onNavigateHome && <button type="button" onClick={onNavigateHome} className="mt-2 rounded-full bg-primary-container px-6 py-2.5 font-label-lg text-label-lg font-semibold text-on-primary shadow-sm hover:bg-tertiary-container">{t('offers.explore')}</button>}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((v, index) => {
              const isCopied = copied === v.code;
              const usedUp = v.remainingForMe === 0;
              const time = period(v, t, locale);
              return (
                <article key={v.code} className="group flex flex-col overflow-hidden rounded-[1.5rem] bg-surface-container-lowest shadow-[0_10px_30px_-10px_rgba(120,53,15,0.18)] transition-shadow hover:shadow-[0_18px_40px_-12px_rgba(120,53,15,0.28)]">
                  <div className="relative h-44 overflow-hidden">
                    <img src={img(CARD_IMAGES[index % CARD_IMAGES.length])} alt="" loading="lazy" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${usedUp ? 'grayscale' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-primary-container px-3.5 py-1.5 font-headline-sm text-lg font-bold text-on-primary shadow-md">{badge(v, t, locale)}</span>
                    {time.urgent && !usedUp && (
                      <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>{time.text}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div>
                      <h3 className="font-headline-sm text-[19px] font-semibold leading-snug text-on-surface">{title(v, t, locale)}</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">{subtitle(v, t, locale)}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-outline">
                        <span className="material-symbols-outlined text-[14px]">event</span>{usedUp ? t('offers.used') : time.text}
                      </p>
                    </div>

                    {/* Ô mã + nút sao chép liền khối */}
                    <div className={`mt-auto flex items-center overflow-hidden rounded-full border-2 border-dashed ${isCopied ? 'border-emerald-500' : 'border-primary/40'}`}>
                      <span className="min-w-0 flex-1 truncate px-4 font-mono text-[15px] font-bold tracking-[0.15em] text-on-surface">{v.code}</span>
                      <button type="button" disabled={usedUp} onClick={() => void copy(v.code)}
                        className={`m-1 flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-primary-container text-on-primary hover:bg-tertiary-container'}`}>
                        <span className="material-symbols-outlined text-[18px]">{isCopied ? 'check' : 'content_copy'}</span>
                        {isCopied ? t('offers.copied') : t('offers.copy')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* CÁCH SỬ DỤNG — stepper ngang có đường nối */}
      <section className="mx-auto mt-14 max-w-[1200px] px-5">
        <div className="grid gap-8 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 md:p-8 lg:grid-cols-[260px_1fr] lg:items-center">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{t('offers.howTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('offers.listHint')}</p>
            {onNavigateSearch && (
              <button type="button" onClick={onNavigateSearch} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90">
                {t('offers.findRoom')}<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            )}
          </div>

          <ol className="grid gap-6 md:grid-cols-3 md:gap-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 md:flex-col md:gap-3">
                {/* Đường nối tới bước sau */}
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="absolute left-5 top-11 h-[calc(100%-1.5rem)] w-px bg-outline-variant/60 md:left-12 md:right-0 md:top-5 md:h-px md:w-auto" />
                )}
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary ring-4 ring-surface-container-lowest">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-[20px] text-primary">{step.icon}</span>{t(step.title)}
                  </span>
                  <span className="mt-1 block text-sm text-on-surface-variant">{t(step.text)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
};
export default OffersPage;
