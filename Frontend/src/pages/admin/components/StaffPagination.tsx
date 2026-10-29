import React from 'react';

export const StaffPagination: React.FC<{
  page: number; total: number; pageSize: number; onChange: (page: number) => void;
}> = ({ page, total, pageSize, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav aria-label="Phân trang nhân viên" className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 p-5 text-sm">
    <span>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} / {total} kết quả</span>
    <div className="flex items-center gap-3">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full bg-surface-container px-4 py-2 disabled:opacity-40">Trước</button>
      <span aria-live="polite">Trang {page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-full bg-surface-container px-4 py-2 disabled:opacity-40">Sau</button>
    </div>
  </nav>;
};
