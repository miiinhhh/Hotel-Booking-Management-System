import React, { useState } from 'react';
import { BookingItem } from '../types';

interface CancelBookingModalProps {
  isOpen: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onConfirmCancel: (bookingId: string, reason: string) => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  booking,
  onClose,
  onConfirmCancel,
}) => {
  const [cancelReason, setCancelReason] = useState('Thay đổi lịch trình đột xuất');

  if (!isOpen || !booking) return null;

  const refundAmountText = booking.paidAmount
    ? `${booking.paidAmount.toLocaleString('vi-VN')}đ`
    : `${booking.totalAmount.toLocaleString('vi-VN')}đ`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-lg p-space-lg shadow-2xl transform transition-transform">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-outline hover:text-on-surface transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>

        <div className="flex items-center gap-space-sm mb-4">
          <div className="w-10 h-10 rounded-full bg-error-container/40 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[22px]">event_busy</span>
          </div>
          <div>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
              Yêu cầu hủy phòng
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Xác nhận hủy đặt phòng
            </h3>
          </div>
        </div>

        <div className="bg-surface-container-low rounded p-space-md mb-space-md">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-surface-container">
            <span className="font-label-md text-label-md text-on-surface-variant">Mã đơn:</span>
            <span className="font-headline-sm text-[16px] text-primary">
              {booking.bookingCode}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Theo chính sách lưu trú, bạn đủ điều kiện{' '}
            <strong className="text-on-surface">hoàn trả 100% tiền cọc</strong> ({refundAmountText}).
            Số tiền sẽ được chuyển hoàn về tài khoản nguồn trong 24 giờ làm việc.
          </p>
        </div>

        <div className="mb-space-lg">
          <label className="block font-label-md text-label-md text-on-surface mb-2 font-medium">
            Lý do hủy đặt phòng:
          </label>
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full bg-surface rounded-full px-4 py-2.5 text-body-md text-on-surface outline-none focus:bg-surface-container transition-all cursor-pointer border border-outline-variant/30"
          >
            <option value="Thay đổi lịch trình đột xuất">Thay đổi lịch trình đột xuất</option>
            <option value="Tìm thấy nơi nghỉ dưỡng phù hợp hơn">
              Tìm thấy nơi nghỉ dưỡng phù hợp hơn
            </option>
            <option value="Lý do sức khỏe cá nhân">Lý do sức khỏe cá nhân</option>
            <option value="Khác">Khác</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            Giữ lại đơn
          </button>
          <button
            onClick={() => onConfirmCancel(booking.id, cancelReason)}
            className="px-6 py-2.5 rounded-full bg-error text-on-error font-label-lg text-label-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Xác nhận hủy phòng
          </button>
        </div>
      </div>
    </div>
  );
};
