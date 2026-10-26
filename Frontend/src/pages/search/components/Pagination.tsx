import React from 'react';
interface PaginationProps { currentPage?: number; totalPages?: number; startItem?: number; endItem?: number; totalItems?: number; onPageChange?: (page: number) => void }
export const Pagination: React.FC<PaginationProps> = ({ currentPage = 1, totalPages = 1, startItem = 0, endItem = 0, totalItems = 0, onPageChange }) => {
  if (totalPages < 1) return null;
  const first = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => first + i);
  return <nav aria-label="Phân trang kết quả" className="flex flex-wrap items-center justify-between gap-3 py-5"><span>Hiển thị {startItem} – {endItem} / {totalItems} kết quả</span><div className="flex gap-2"><button disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)} className="rounded-full border px-3 py-2 disabled:opacity-40">Trước</button>{pages.map(page => <button key={page} aria-current={page === currentPage ? 'page' : undefined} onClick={() => onPageChange?.(page)} className={`rounded-full border px-4 py-2 ${page === currentPage ? 'bg-primary text-on-primary' : ''}`}>{page}</button>)}<button disabled={currentPage >= totalPages} onClick={() => onPageChange?.(currentPage + 1)} className="rounded-full border px-3 py-2 disabled:opacity-40">Sau</button></div></nav>;
};
export default Pagination;
