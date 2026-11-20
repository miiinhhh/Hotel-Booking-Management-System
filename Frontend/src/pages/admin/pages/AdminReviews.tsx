import React, { useEffect, useState } from 'react';
import { PageHeading, Toast } from '../components/AdminUi';
import { getHotelsList } from '../../../services/pricingAdminApi';
import { ModerationHotel, ReviewModerationPanel } from '../../../components/reviews/ReviewModerationPanel';

export const AdminReviews: React.FC = () => {
  const [hotels, setHotels] = useState<ModerationHotel[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getHotelsList().then((res) => {
      if (res.success && res.data) setHotels(res.data.items.map((h) => ({ hotelId: h.hotelId, hotelName: h.hotelName })));
      else setError(res.message || 'Không tải được danh sách khách sạn.');
    });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return <>
    <PageHeading title="Quản lý đánh giá" description="Hiển thị hoặc ẩn đánh giá của khách. Đánh giá không thể bị xóa; khi ẩn phải ghi rõ lý do để lưu lịch sử kiểm duyệt." />
    {error && <p role="alert" className="mb-5 rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    <ReviewModerationPanel hotels={hotels} onToast={setToast} />
    <Toast message={toast} />
  </>;
};
export default AdminReviews;
