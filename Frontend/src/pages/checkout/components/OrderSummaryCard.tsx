import React, { useState } from 'react';
import { CheckoutBookingData, PaymentMethodType } from '../types';

interface OrderSummaryCardProps {
  bookingData: CheckoutBookingData;
  selectedPaymentMethod: PaymentMethodType;
  onApplyCoupon: (code: string) => boolean | Promise<boolean>;
  onConfirmBooking: () => void;
  isSubmitting: boolean;
  submissionStep: number;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  bookingData,
  selectedPaymentMethod,
  onApplyCoupon,
  onConfirmBooking,
  isSubmitting,
  submissionStep,
}) => {
  const [couponInput, setCouponInput] = useState(bookingData.couponCode);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const handleApply = async () => {
    if (!couponInput.trim()) return;
    setCouponMessage('Đang kiểm tra mã...');
    const success = await onApplyCoupon(couponInput.trim());
    if (success) {
      setCouponMessage(`Đã áp dụng mã ${couponInput.trim().toUpperCase()}`);
    } else {
      setCouponMessage('Mã ưu đãi không hợp lệ hoặc đã hết hạn');
    }
  };

  const paymentDueToday =
    selectedPaymentMethod === 'pay_at_hotel'
      ? 0
      : bookingData.depositAmount;

  const paymentDueAtHotel =
    selectedPaymentMethod === 'pay_at_hotel'
      ? bookingData.totalPrice
      : bookingData.remainingAmount;

  return (
    <div className="lg:col-span-5 sticky top-28 flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest rounded-lg p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
        {/* Hotel & Room Header */}
        <div className="flex gap-space-sm items-start">
          <img
            src={bookingData.hotelImage}
            alt={bookingData.hotelName}
            className="w-24 h-24 rounded-lg object-cover shrink-0 shadow-sm"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-primary">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
              <span className="font-label-sm text-label-sm ml-1 text-on-surface-variant font-medium">
                {bookingData.starRatingText}
              </span>
            </div>
            <h3 className="font-headline-sm text-on-surface mt-0.5 text-lg leading-tight">
              {bookingData.hotelName}
            </h3>
            <p className="font-body-md text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">
                location_on
              </span>
              {bookingData.location}
            </p>
          </div>
        </div>

        {/* Room Specifics */}
        <div className="bg-surface-container-low/60 rounded-md p-space-sm flex flex-col gap-2">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">
              Hạng phòng cao cấp
            </span>
            <h4 className="font-headline-sm text-on-surface text-base">
              {bookingData.roomName}
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap font-body-md text-label-sm text-on-surface-variant">
            {bookingData.roomAmenities.map((amenity, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-surface-container-lowest px-2.5 py-1 rounded-full"
              >
                <span className="material-symbols-outlined text-[14px] text-primary">
                  {idx === 0 ? 'restaurant' : idx === 1 ? 'local_cafe' : 'pool'}
                </span>
                {amenity}
              </span>
            ))}
          </div>
        </div>

        {/* Stay Schedule */}
        <div className="grid grid-cols-2 gap-2 bg-surface-container-lowest py-2">
          <div className="flex flex-col p-2.5 rounded bg-surface-container-low/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Nhận phòng
            </span>
            <span className="font-headline-sm text-on-surface text-sm mt-0.5">
              {bookingData.checkInDateText}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {bookingData.checkInTimeText}
            </span>
          </div>
          <div className="flex flex-col p-2.5 rounded bg-surface-container-low/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Trả phòng
            </span>
            <span className="font-headline-sm text-on-surface text-sm mt-0.5">
              {bookingData.checkOutDateText}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {bookingData.checkOutTimeText}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between font-label-md text-label-md text-on-surface-variant px-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">bed</span>
            Thời gian: {bookingData.nightsCount} đêm
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">group</span>
            {bookingData.guestsText}
          </span>
        </div>

        {/* Promo Code Box */}
        <div className="bg-surface-container-low/50 p-space-sm rounded-lg flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Mã ưu đãi (vd: LUXE2025)"
              className="w-full bg-surface-container-lowest text-on-surface px-3 py-2 rounded-full font-label-md text-label-md uppercase tracking-wider focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-surface-container-highest hover:bg-surface-dim text-on-surface font-label-md text-label-md rounded-full transition-colors whitespace-nowrap cursor-pointer"
            >
              Áp dụng
            </button>
          </div>

          {bookingData.couponDiscount > 0 && (
            <div className="flex items-center justify-between bg-surface-container-lowest px-3 py-1.5 rounded-full text-primary font-label-sm text-label-sm">
              <span className="flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                {couponMessage || `Đã áp dụng mã ${bookingData.couponCode}`}
              </span>
              <span className="font-bold">
                -{bookingData.couponDiscount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}
        </div>

        {/* Price Calculation */}
        <div className="flex flex-col gap-2.5 py-1">
          <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
            <span>Giá phòng niêm yết ({bookingData.nightsCount} đêm)</span>
            <span className="text-on-surface font-medium">
              {bookingData.originalPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
            <span className="flex items-center gap-1">
              Thuế GTGT &amp; Phí phục vụ 5%
              <span className="material-symbols-outlined text-[14px]">info</span>
            </span>
            <span className="text-on-surface font-medium">Đã bao gồm</span>
          </div>
          {bookingData.couponDiscount > 0 && (
            <div className="flex justify-between items-center font-body-md text-body-md text-primary">
              <span>Ưu đãi thành viên StayLuxe</span>
              <span className="font-semibold">
                -{bookingData.couponDiscount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}
          <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
            <span>Trà chiều hoàng gia &amp; Ăn sáng</span>
            <span className="text-primary font-medium">Miễn phí đặc quyền</span>
          </div>

          <div className="w-full h-px bg-surface-container-high my-1" />

          <div className="flex justify-between items-baseline pt-1">
            <div className="flex flex-col">
              <span className="font-headline-sm text-on-surface">Tổng chi phí</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Đã bao gồm toàn bộ thuế &amp; phí
              </span>
            </div>
            <span className="font-headline-lg text-on-surface tracking-tight font-bold">
              {bookingData.totalPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Deposit Breakdown Box */}
          <div className="bg-secondary-fixed/50 p-space-sm rounded-md flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-secondary-fixed font-semibold">
                {selectedPaymentMethod === 'pay_at_hotel'
                  ? 'Cần thanh toán hôm nay:'
                  : `Cần thanh toán hôm nay (${bookingData.depositPercentage}% cọc):`}
              </span>
              <span className="font-headline-sm text-primary font-bold">
                {paymentDueToday.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex justify-between items-center text-on-secondary-fixed-variant font-label-sm text-label-sm">
              <span>Thanh toán tại resort lúc check-in:</span>
              <span className="font-semibold">
                {paymentDueAtHotel.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>

        {/* Checkout CTA Button */}
        <button
          type="button"
          onClick={onConfirmBooking}
          disabled={isSubmitting}
          className="w-full bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-wait"
        >
          {isSubmitting ? (
            submissionStep === 1 ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span>Đang tạo mã thanh toán bảo mật...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">done_all</span>
                <span>Xác nhận thành công! Đang chuyển tiếp...</span>
              </>
            )
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">lock</span>
              <span>
                {selectedPaymentMethod === 'pay_at_hotel'
                  ? 'Xác nhận đặt giữ phòng · 0đ'
                  : `Xác nhận đặt phòng · ${paymentDueToday.toLocaleString('vi-VN')}đ`}
              </span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div className="flex flex-col gap-2 pt-1 font-body-md text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">security</span>
            <span>Bảo mật giao dịch tiêu chuẩn quốc tế PCI-DSS &amp; SSL 256-bit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">
              event_available
            </span>
            <span>Hủy phòng miễn phí 100% trước 14:00 ngày 14/04/2025</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">
              electric_bolt
            </span>
            <span>Nhận mã phòng xác nhận tức thì qua tin nhắn SMS &amp; Email</span>
          </div>
        </div>
      </div>

      {/* Concierge Hotline Assistant */}
      <div className="bg-surface-container-low rounded-lg p-space-md flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs">
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
          </div>
          <div>
            <p className="font-headline-sm text-sm text-on-surface">Cần trợ giúp riêng?</p>
            <p className="font-body-md text-label-sm text-on-surface-variant">
              Quản gia StayLuxe hỗ trợ 24/7
            </p>
          </div>
        </div>
        <a
          href="tel:18006868"
          className="font-label-md text-label-md text-primary font-bold hover:underline flex items-center gap-1"
        >
          Gọi 1800 6868
        </a>
      </div>
    </div>
  );
};
