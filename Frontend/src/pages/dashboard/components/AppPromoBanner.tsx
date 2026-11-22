import React from 'react';
import { useLanguage, TranslationKey } from '../../../i18n/LanguageContext';

/**
 * Cấu hình qua .env (để trống = chưa phát hành file):
 *  - VITE_ANDROID_APK_URL : đường dẫn file APK, VD /downloads/stayluxe.apk
 *  - VITE_ANDROID_APK_QR  : ảnh mã QR trỏ tới file APK, VD /downloads/stayluxe-qr.png
 */
const APK_URL = (import.meta.env.VITE_ANDROID_APK_URL as string | undefined)?.trim() || '';
const APK_QR = (import.meta.env.VITE_ANDROID_APK_QR as string | undefined)?.trim() || '';

// Tính năng app Android đang có thật.
const HIGHLIGHTS: TranslationKey[] = ['app.point1', 'app.point2', 'app.point3'];

/** Dải giới thiệu ứng dụng Android — bố cục kiểu "Get the app" của các trang đặt phòng lớn. */
export const AppPromoBanner: React.FC = () => {
  const { t } = useLanguage();
  return (
  <section className="mx-auto mt-24 w-full max-w-[1440px] px-5" aria-labelledby="app-promo-title">
    <div className="relative grid items-end gap-6 rounded-2xl bg-gradient-to-r from-primary-fixed/45 via-surface-container-low to-surface-container-low px-8 pt-10 md:grid-cols-[1.15fr_1fr] md:px-14 md:pt-0">

      {/* Trái: thông điệp + hành động */}
      <div className="pb-10 md:py-12">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <span className="material-symbols-outlined text-[20px]">android</span>{t('app.eyebrow')}
        </p>
        <h2 id="app-promo-title" className="mt-2 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-on-surface md:text-4xl">
          {t('app.title')}
        </h2>
        <p className="mt-3 max-w-md text-on-surface-variant">
          {t('app.subtitle')}
        </p>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {HIGHLIGHTS.map(h => (
            <li key={h} className="flex items-center gap-1.5 text-sm font-medium text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>{t(h)}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-5">
          {APK_URL ? (
            <a href={APK_URL} download
              className="inline-flex items-center gap-3 rounded-2xl bg-on-surface px-5 py-2.5 text-surface transition-opacity hover:opacity-90">
              <span className="material-symbols-outlined text-[28px]">android</span>
              <span className="leading-tight">
                <span className="block text-[11px] opacity-80">{t('app.downloadFor')}</span>
                <span className="block text-base font-semibold">{t('app.downloadName')}</span>
              </span>
            </a>
          ) : (
            <span aria-disabled="true"
              className="inline-flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px]">android</span>
              <span className="leading-tight">
                <span className="block text-[11px]">{t('app.comingSoon')}</span>
                <span className="block text-base font-semibold">{t('app.comingSoonName')}</span>
              </span>
            </span>
          )}

          {APK_URL && APK_QR && (
            <div className="flex items-center gap-3">
              <img src={APK_QR} alt={t('app.qrAlt')} width={76} height={76}
                className="h-[76px] w-[76px] rounded-xl bg-white p-1.5 shadow-sm" />
              <span className="max-w-[120px] text-xs text-on-surface-variant">{t('app.qrHint')}</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-outline">{t('app.requirement')}</p>
      </div>

      {/* Phải: điện thoại tràn khỏi mép trên của dải */}
      <div className="relative hidden h-full justify-center md:flex" aria-hidden="true">
        <div className="absolute bottom-0 h-[440px] w-[236px] -translate-y-0 overflow-hidden rounded-t-[2.5rem] border-[7px] border-b-0 border-on-surface/90 bg-background shadow-2xl">
          {/* thanh trạng thái */}
          <div className="flex items-center justify-between px-5 pt-3 text-[9px] font-semibold text-on-surface/70">
            <span>9:41</span><span className="h-1.5 w-12 rounded-full bg-on-surface/80" /><span>100%</span>
          </div>
          {/* đầu app */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary">
                <span className="material-symbols-outlined text-[14px]">villa</span>
              </span>
              <span className="text-[13px] font-bold text-on-surface">StayLuxe</span>
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-snug text-on-surface">{t('app.mockWhere')}</p>
            <div className="mt-2.5 space-y-1.5 rounded-2xl bg-surface-container-lowest p-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1.5 text-[10px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[13px]">location_on</span>Đà Nẵng
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1.5 text-[10px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[13px]">calendar_month</span>{t('app.mockDates')}
              </div>
              <div className="rounded-full bg-primary py-1.5 text-center text-[10px] font-semibold text-on-primary">{t('app.mockSearch')}</div>
            </div>
          </div>
          {/* thẻ khách sạn */}
          <div className="mt-3 space-y-2 px-4">
            {['bg-primary-fixed/70', 'bg-secondary-container/60'].map((tone, i) => (
              <div key={i} className="flex gap-2 rounded-2xl bg-surface-container-lowest p-2 shadow-sm">
                <div className={`h-12 w-12 shrink-0 rounded-xl ${tone}`} />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2 w-20 rounded-full bg-on-surface/25" />
                  <div className="h-1.5 w-14 rounded-full bg-on-surface/10" />
                  <div className="h-2 w-10 rounded-full bg-primary/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};
export default AppPromoBanner;
