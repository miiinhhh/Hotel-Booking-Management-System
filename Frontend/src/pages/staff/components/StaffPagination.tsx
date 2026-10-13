import React from 'react';

interface StaffPaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const StaffPagination: React.FC<StaffPaginationProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface-container-low/70 border-t border-[#eae8e5] font-label-md text-label-md text-on-surface-variant rounded-b-DEFAULT">
      <div className="flex items-center gap-1.5">
        <span>Hiển thị</span>
        <span className="font-semibold text-on-surface">
          {startItem} — {endItem}
        </span>
        <span>trên tổng số</span>
        <span className="font-bold text-primary">{totalItems}</span>
        <span>đơn đặt phòng</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
            Số dòng:
          </span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md border border-[#eae8e5] focus:outline-none cursor-pointer"
            >
              <option value="6">6 đơn / trang</option>
              <option value="10">10 đơn / trang</option>
              <option value="25">25 đơn / trang</option>
              <option value="50">50 đơn / trang</option>
            </select>
          </div>
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              currentPage <= 1
                ? 'text-outline cursor-not-allowed opacity-50'
                : 'text-on-surface hover:bg-surface-container cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-full font-medium flex items-center justify-center transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              currentPage >= totalPages
                ? 'text-outline cursor-not-allowed opacity-50'
                : 'text-on-surface hover:bg-surface-container cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};
