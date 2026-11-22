import React from 'react';
import { BookingStats } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';

interface BookingStatsRowProps {
  stats: BookingStats;
}

export const BookingStatsRow: React.FC<BookingStatsRowProps> = ({ stats }) => {
  const { t } = useLanguage();
  const pill = 'bg-surface-container-lowest px-5 py-3.5 rounded-full shadow-sm flex items-center gap-3';
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-2">
      <div className="max-w-2xl">
        <span className="text-xs uppercase tracking-widest text-primary font-bold">{t('history.eyebrow')}</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">{t('history.title')}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">{t('history.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <div className={pill}>
          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold leading-tight text-on-surface">{t('history.statUpcoming', { count: stats.upcomingCount })}</span>
            <span className="text-[11px] text-outline">
              {t('history.statUpcomingLabel')}
              {stats.pendingPaymentCount > 0 && <span className="text-primary font-semibold"> · {t('history.statPendingPay', { count: stats.pendingPaymentCount })}</span>}
            </span>
          </span>
        </div>
        <div className={pill}>
          <span className="w-8 h-8 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold leading-tight text-on-surface">{t('history.statCompleted', { count: stats.completedCount })}</span>
            <span className="text-[11px] text-outline">{t('history.statCompletedLabel')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
export default BookingStatsRow;
