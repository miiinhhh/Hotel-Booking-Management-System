import React, { useState } from 'react';
import { ReviewStayModal } from '../booking-history/components/ReviewStayModal';
import { BookingItem } from '../booking-history/types';

interface ReviewPageProps {
  booking?: BookingItem;
  onNavigateHome?: () => void;
  onNavigateHistory?: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  booking,
  onNavigateHome,
  onNavigateHistory,
}) => {
  const defaultBooking: BookingItem = booking || {
    id: 'booking-review-default',
    bookingCode: '#SL-88492',
    hotelName: 'Naman Retreat Đà Nẵng',
    hotelCategory: 'Khu Nghỉ Dưỡng Chữa Lành 5 Sao',
    location: 'Bãi biển Non Nước, Đà Nẵng',
    roomType: 'Biệt thự 1 phòng ngủ có hồ bơi riêng (One-Bedroom Pool Villa)',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDKJiFktCkZPVtynmzSfxjtPMkS9ieT6CiRpM5pbEUgAZzobcsaNYWYKblTOOVrrSypt7kTHRzh-WCu_2iBrzQL8i3JglnmdfXvaQpulEtgas5H9ASO1od6hNckPpmdnZjtLGxmQ-CaQoIjHf944Yn6VHOX989tTioSEu-_QsDHrna6diiVGVtrMGQIt0VX6xhwrP97MiXmtN0EpwGZ6SkagfWl4H9vroKQrlHlvnqe',
    imageAlt: 'Naman Retreat Da Nang',
    nightsText: '3 ngày 2 đêm',
    checkInDate: '24/10/2025',
    checkInDetail: 'Từ 14:00',
    checkOutDate: '27/10/2025',
    checkOutDetail: 'Trước 12:00',
    guest: {
      name: 'Nguyễn Văn A',
      countText: '2 người lớn · 1 trẻ em',
    },
    amenities: [
      { icon: 'pool', text: 'Hồ bơi riêng' },
      { icon: 'spa', text: 'Pure Spa' },
    ],
    status: 'completed',
    statusLabel: 'ĐÃ HOÀN TẤT',
    depositBadge: 'ĐÃ THANH TOÁN ĐỦ',
    totalAmount: 16800000,
    paidAmount: 16800000,
    remainingAmount: 0,
    qrType: 'checkin',
    qrCaption: 'Đặt phòng đã hoàn tất',
    isEligibleForReview: true,
  };

  const [submitted, setSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState(5);

  const handleSubmitReview = (
    _bookingId: string,
    rating: number,
    _comment: string
  ) => {
    setSubmittedScore(rating);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="min-h-screen pt-28 pb-16 px-4 max-w-xl mx-auto flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-200">
          <span
            className="material-symbols-outlined text-[40px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
        </div>
        <h2 className="font-headline-md text-2xl font-bold text-on-surface mb-2">
          Cảm ơn quý khách đã gửi đánh giá!
        </h2>
        <p className="text-on-surface-variant font-body-md text-sm mb-6">
          Đánh giá {submittedScore}/5 sao cho kỳ nghỉ tại{' '}
          <strong className="text-on-surface">{defaultBooking.hotelName}</strong> đã được ghi nhận.
          +250 Điểm StayLuxe Rewards đã được tích lũy vào tài khoản hội viên của bạn.
        </p>
        <div className="flex gap-3">
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="px-6 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            >
              Xem lịch sử đặt phòng
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-md hover:bg-tertiary-container transition-colors cursor-pointer"
            >
              Về trang chủ
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <ReviewStayModal
      isOpen={true}
      booking={defaultBooking}
      onClose={() => {
        if (onNavigateHistory) onNavigateHistory();
        else if (onNavigateHome) onNavigateHome();
      }}
      onSubmitReview={handleSubmitReview}
    />
  );
};
export default ReviewPage;
