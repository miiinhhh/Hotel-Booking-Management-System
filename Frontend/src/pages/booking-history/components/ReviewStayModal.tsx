import React, { useState } from 'react';
import { BookingItem } from '../types';

interface ReviewStayModalProps {
  isOpen: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onSubmitReview: (bookingId: string, rating: number, comment: string) => void;
}

export const ReviewStayModal: React.FC<ReviewStayModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSubmitReview,
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-lg p-space-lg shadow-2xl transform transition-transform">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-outline hover:text-on-surface transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>

        <div className="flex items-center gap-space-sm mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[22px]">hotel_class</span>
          </div>
          <div>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
              Chia sẻ trải nghiệm
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Đánh giá kỳ nghỉ dưỡng
            </h3>
          </div>
        </div>

        <div className="text-body-md text-on-surface-variant mb-6">
          Bạn đang đánh giá đơn phòng tại{' '}
          <strong className="text-on-surface">{booking.hotelName}</strong> ({booking.checkInDate} -{' '}
          {booking.checkOutDate}).
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 rounded bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface font-medium">
              Độ hài lòng chung ({hoverRating || rating}/5 sao):
            </span>
            <div className="flex items-center gap-1 text-primary-container cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="focus:outline-none cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-[26px]"
                      style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2 font-medium">
              Nhận xét chi tiết:
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-surface rounded-DEFAULT p-3 text-body-md text-on-surface outline-none focus:bg-surface-container transition-all border border-outline-variant/30 resize-none"
              placeholder="Chia sẻ về sự hiếu khách, hồ bơi riêng, tiện nghi phòng..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            Để sau
          </button>
          <button
            onClick={() => onSubmitReview(booking.id, rating, comment)}
            className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Gửi đánh giá (+250 Điểm thưởng)
          </button>
        </div>
      </div>
    </div>
  );
};
