import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';

interface PaginationProps { currentPage?: number; totalPages?: number; startItem?: number; endItem?: number; totalItems?: number; onPageChange?: (page: number) => void }

export const Pagination: React.FC<PaginationProps> = ({ currentPage = 1, totalPages = 1, startItem = 0, endItem = 0, totalItems = 0, onPageChange }) => {
  const { t } = useLanguage();
  if (totalPages < 1) return null;
  const first = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => first + i);
  const nav = 'inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container disabled:opacity-30';
  return (
    <nav aria-label={t('search.pagination')} className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <span className="text-on-surface-variant">{t('search.showing', { from: startItem, to: endItem, total: totalItems })}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)} aria-label={t('search.prev')} className={nav}><span className="material-symbols-outlined">chevron_left</span></button>
          {pages.map(page => (
            <button key={page} type="button" aria-current={page === currentPage ? 'page' : undefined} onClick={() => onPageChange?.(page)}
              className={`h-9 min-w-9 rounded-full px-3 font-semibold ${page === currentPage ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container'}`}>{page}</button>
          ))}
          <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange?.(currentPage + 1)} aria-label={t('search.next')} className={nav}><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
      )}
    </nav>
  );
};
export default Pagination;
