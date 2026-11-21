import React from 'react';
import { StaffCustomer } from '../types';

interface StaffCustomerMetricsProps {
  customers: StaffCustomer[];
  loading?: boolean;
}

/**
 * Bốn chỉ số tính trực tiếp từ danh sách khách trong phạm vi phụ trách.
 * (Bỏ chỉ số "chuẩn hóa CCCD" vì máy chủ chưa trả số giấy tờ → luôn 0%.)
 */
export const StaffCustomerMetrics: React.FC<StaffCustomerMetricsProps> = ({ customers, loading }) => {
  const staying = customers.filter(c => c.isStaying).length;
  const returning = customers.filter(c => c.totalCompletedBookings > 1).length;
  const completed = customers.reduce((s, c) => s + c.totalCompletedBookings, 0);
  const spend = customers.reduce((s, c) => s + c.totalSpend, 0);

  const items = [
    { icon: 'group', label: 'Khách trong phạm vi', value: customers.length.toLocaleString('vi-VN'), note: 'Có đặt phòng tại khu bạn phụ trách' },
    { icon: 'hotel', label: 'Đang lưu trú', value: staying.toLocaleString('vi-VN'), note: 'Đã nhận phòng hoặc đang trong kỳ ở' },
    { icon: 'repeat', label: 'Khách quay lại', value: customers.length ? `${Math.round((returning * 100) / customers.length)}%` : '–', note: `${returning} khách có từ 2 lượt hoàn tất` },
    { icon: 'payments', label: 'Chi tiêu / lượt', value: completed ? `${Math.round(spend / completed).toLocaleString('vi-VN')} ₫` : '–', note: 'Bình quân trên lượt lưu trú hoàn tất' },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Chỉ số khách hàng">
      {items.map(i => (
        <article key={i.label} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">{i.icon}</span>{i.label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-on-surface">{loading ? '–' : i.value}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{i.note}</p>
        </article>
      ))}
    </section>
  );
};
