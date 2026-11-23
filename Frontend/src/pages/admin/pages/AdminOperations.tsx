import React, { useState } from 'react';
import { StaffBookingsPage } from '../../staff/StaffBookingsPage';
import { StaffCalendarView } from '../../staff/components/StaffCalendarView';
import { PageHeading, Toast } from '../components/AdminUi';

/**
 * Đặt phòng & thanh toán toàn hệ thống (dùng lại màn hình của Staff, không giới hạn phân khu).
 * Thu tiền / hoàn tiền nằm trong drawer của từng đơn; nút lọc "Chờ hoàn tiền" có sẵn trên thanh lọc.
 */
export const AdminBookings: React.FC = () => <StaffBookingsPage embedded />;

/** Lịch phòng & khóa bán của mọi khách sạn. */
export const AdminCalendar: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);
  const show = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };
  return (
    <>
      <PageHeading title="Lịch phòng & khóa bán" description="Xem tình trạng phòng theo ngày và khóa/mở bán phòng của tất cả khách sạn." />
      <StaffCalendarView onShowToast={show} />
      <Toast message={toast} />
    </>
  );
};
