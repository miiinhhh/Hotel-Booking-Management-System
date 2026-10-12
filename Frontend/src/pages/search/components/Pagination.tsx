import React from 'react';

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  startItem?: number;
  endItem?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalPages = 12,
  startItem = 1,
  endItem = 4,
  totalItems = 142,
  onPageChange,
}) => {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <nav
      aria-label="Phân trang kết quả"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-space-lg mt-space-sm border-t border-surface-container"
    >
      {/* Items info */}
      <span className="font-body-md text-body-md text-on-surface-variant">
        Hiển thị{' '}
        <span className="font-semibold text-on-surface">
          {startItem} - {endItem}
        </span>{' '}
        trong số{' '}
        <span className="font-semibold text-on-surface">{totalItems}</span> nơi
        nghỉ
      </span>

      {/* Page controls */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* Previous Button */}
        <button
          type="button"
          aria-label="Trang trước"
          disabled={isFirstPage}
          onClick={() => onPageChange?.(currentPage - 1)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border-0 ${
            isFirstPage
              ? 'bg-surface-container text-outline opacity-40 cursor-not-allowed'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            chevron_left
          </span>
        </button>

        {/* Page 1 */}
        <button
          type="button"
          onClick={() => onPageChange?.(1)}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-label-lg text-label-lg font-semibold transition-colors border-0 cursor-pointer ${
            currentPage === 1
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          1
        </button>

        {/* Page 2 */}
        <button
          type="button"
          onClick={() => onPageChange?.(2)}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-label-lg text-label-lg transition-colors border-0 cursor-pointer ${
            currentPage === 2
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface font-medium'
          }`}
        >
          2
        </button>

        {/* Page 3 */}
        <button
          type="button"
          onClick={() => onPageChange?.(3)}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-label-lg text-label-lg transition-colors border-0 cursor-pointer ${
            currentPage === 3
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface font-medium'
          }`}
        >
          3
        </button>

        {/* Ellipsis */}
        <span className="px-1 text-outline">…</span>

        {/* Last Page (12) */}
        <button
          type="button"
          onClick={() => onPageChange?.(totalPages)}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-label-lg text-label-lg transition-colors border-0 cursor-pointer ${
            currentPage === totalPages
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface font-medium'
          }`}
        >
          {totalPages}
        </button>

        {/* Next Button */}
        <button
          type="button"
          aria-label="Trang tiếp theo"
          disabled={isLastPage}
          onClick={() => onPageChange?.(currentPage + 1)}
          className={`px-space-md h-10 rounded-full flex items-center gap-1 font-label-lg text-label-lg font-medium transition-colors border-0 ${
            isLastPage
              ? 'bg-surface-container text-outline opacity-40 cursor-not-allowed'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer'
          }`}
        >
          <span>Trang kế</span>
          <span className="material-symbols-outlined text-[18px]">
            chevron_right
          </span>
        </button>
      </div>
    </nav>
  );
};
export default Pagination;
