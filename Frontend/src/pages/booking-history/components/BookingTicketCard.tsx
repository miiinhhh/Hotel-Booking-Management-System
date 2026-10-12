import React from 'react';
import { BookingItem } from '../types';

interface BookingTicketCardProps {
  booking: BookingItem;
  onCopyCode: (code: string) => void;
  onOpenCancelModal: (booking: BookingItem) => void;
  onOpenReviewModal: (booking: BookingItem) => void;
  onPayNow?: (booking: BookingItem) => void;
  onRebook?: (booking: BookingItem) => void;
}

export const BookingTicketCard: React.FC<BookingTicketCardProps> = ({
  booking,
  onCopyCode,
  onOpenCancelModal,
  onOpenReviewModal,
  onPayNow,
  onRebook,
}) => {
  const isPending = booking.status === 'pending';
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isConfirmed = booking.status === 'confirmed';

  return (
    <div className="relative bg-surface-container-lowest rounded-lg shadow-[0_4px_24px_-2px_rgba(120,53,15,0.06)] hover:shadow-[0_12px_32px_-4px_rgba(120,53,15,0.1)] transition-all overflow-hidden flex flex-col xl:flex-row">
      {/* Ticket Cut-Out Decorative Holes */}
      <div className="hidden xl:block absolute right-[320px] top-[-14px] w-7 h-7 rounded-full bg-background z-10" />
      <div className="hidden xl:block absolute right-[320px] bottom-[-14px] w-7 h-7 rounded-full bg-background z-10" />

      {/* Main Stay Pass Section (Left + Middle) */}
      <div className="flex-1 p-space-md md:p-space-lg flex flex-col lg:flex-row gap-space-md">
        {/* Image and Base Metadata */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-3">
          <div className="relative w-full h-48 md:h-52 rounded-DEFAULT overflow-hidden">
            <img
              src={booking.image}
              alt={booking.imageAlt || booking.hotelName}
              className={`w-full h-full object-cover transform hover:scale-105 transition-transform duration-500 ${
                isCompleted ? 'grayscale-[20%] hover:grayscale-0' : ''
              }`}
            />
            {/* Night Counter Overlay */}
            <div className="absolute bottom-3 left-3 bg-inverse-surface/85 backdrop-blur-md px-3 py-1 rounded-full text-inverse-on-surface font-label-sm text-label-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">
                {isCompleted ? 'done_all' : isPending ? 'celebration' : 'bedtime'}
              </span>
              <span>{booking.nightsText}</span>
            </div>
          </div>

          {/* Booking Reference Code */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-outline uppercase tracking-wider text-[11px]">
                MÃ ĐẶT PHÒNG:
              </span>
              <span className="font-headline-sm text-[16px] text-on-surface tracking-wide">
                {booking.bookingCode}
              </span>
            </div>
            <button
              onClick={() => onCopyCode(booking.bookingCode)}
              className="text-outline hover:text-primary transition-colors cursor-pointer"
              title="Sao chép mã"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
        </div>

        {/* Stay Details & Schedule */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            {/* Top Row: Hotel Name & Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary-container font-semibold">
                  {booking.hotelCategory}
                </span>
                <span className="text-outline">•</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    location_on
                  </span>{' '}
                  {booking.location}
                </span>
              </div>

              {/* Status Badge */}
              {isConfirmed && (
                <span className="px-3.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold tracking-wide inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  {booking.statusLabel}
                </span>
              )}
              {isPending && (
                <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold tracking-wide inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    timelapse
                  </span>
                  {booking.statusLabel}
                </span>
              )}
              {isCompleted && (
                <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold tracking-wide inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  {booking.statusLabel}
                </span>
              )}
              {isCancelled && (
                <span className="px-3 py-1 rounded-full bg-error-container/40 text-error font-label-sm text-label-sm font-semibold tracking-wide inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  {booking.statusLabel}
                </span>
              )}
            </div>

            {/* Accommodation Title */}
            <h2 className="font-headline-md text-[24px] text-on-surface tracking-tight mb-1">
              {booking.hotelName}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant font-medium mb-4">
              {booking.roomType}
            </p>

            {/* Date Grid Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded bg-surface-container-low mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </div>
                <div>
                  <span className="font-label-sm text-outline uppercase tracking-wider block text-[10px]">
                    NHẬN PHÒNG (CHECK-IN)
                  </span>
                  <span className="font-headline-sm text-[16px] text-on-surface">
                    {booking.checkInDate}
                  </span>
                  <span className="font-body-md text-[12px] text-on-surface-variant block">
                    {booking.checkInDetail}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-outline shrink-0">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </div>
                <div>
                  <span className="font-label-sm text-outline uppercase tracking-wider block text-[10px]">
                    TRẢ PHÒNG (CHECK-OUT)
                  </span>
                  <span className="font-headline-sm text-[16px] text-on-surface">
                    {booking.checkOutDate}
                  </span>
                  <span className="font-body-md text-[12px] text-on-surface-variant block">
                    {booking.checkOutDetail}
                  </span>
                </div>
              </div>
            </div>

            {/* Amenity Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {booking.amenities.map((item, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[12px] inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  {item.text}
                </span>
              ))}
            </div>
          </div>

          {/* Payment Strip Bottom */}
          {isConfirmed && (
            <div className="pt-3 border-t border-dashed border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px] font-bold">
                  {booking.depositBadge}
                </span>
                <span className="font-body-md text-[13px] text-on-surface-variant">
                  Đã trả:{' '}
                  <strong className="text-on-surface">
                    {booking.paidAmount?.toLocaleString('vi-VN')}đ
                  </strong>{' '}
                  · Còn lại tại quầy:{' '}
                  <strong className="text-on-surface">
                    {booking.remainingAmount?.toLocaleString('vi-VN')}đ
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary-container font-label-sm text-[12px]">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Check-in ưu tiên 60 giây qua mã QR</span>
              </div>
            </div>
          )}

          {isPending && (
            <div className="pt-3 border-t border-dashed border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[11px] font-bold">
                  {booking.depositBadge}
                </span>
                <span className="font-headline-sm text-[15px] text-error font-semibold">
                  Tổng cần thanh toán: {booking.totalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <p className="font-body-md text-[12px] text-on-surface-variant italic">
                *Vui lòng hoàn tất thanh toán để phòng không bị tự động hủy sau 10 phút.
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="pt-3 border-t border-dashed border-outline-variant/40 flex items-center justify-between">
              <span className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  sentiment_satisfied
                </span>
                Kỳ nghỉ đã kết thúc tốt đẹp. Bạn có muốn lưu lại cảm nhận của mình?
              </span>
            </div>
          )}

          {isCancelled && (
            <div className="pt-3 border-t border-dashed border-outline-variant/40 flex items-center justify-between">
              <span className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-error">info</span>
                Tiền cọc đã được xử lý hoàn tiền về tài khoản ngân hàng gốc.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Stub Right Section */}
      <div className="xl:w-[320px] bg-surface-container-low p-space-md md:p-space-lg flex flex-col justify-between items-center text-center border-t xl:border-t-0 xl:border-l border-dashed border-outline-variant/50 relative">
        <div className="flex flex-col items-center w-full">
          <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mb-2">
            {isConfirmed
              ? 'Thẻ lên phòng kỹ thuật số'
              : isPending
              ? 'Thanh toán VietQR 24/7'
              : isCompleted
              ? 'Đánh giá kỳ nghỉ'
              : 'Đã hủy'}
          </span>

          {/* Confirmed QR Code */}
          {isConfirmed && (
            <div className="p-3 bg-surface-container-lowest rounded-DEFAULT shadow-sm mb-2 flex items-center justify-center">
              <svg className="w-36 h-36" fill="none" viewBox="0 0 140 140">
                <rect fill="#1b1c1a" height="34" rx="6" width="34" x="10" y="10" />
                <rect fill="#ffffff" height="20" rx="3" width="20" x="17" y="17" />
                <rect fill="#9b2f00" height="10" rx="2" width="10" x="22" y="22" />
                <rect fill="#1b1c1a" height="34" rx="6" width="34" x="96" y="10" />
                <rect fill="#ffffff" height="20" rx="3" width="20" x="103" y="17" />
                <rect fill="#9b2f00" height="10" rx="2" width="10" x="108" y="22" />
                <rect fill="#1b1c1a" height="34" rx="6" width="34" x="10" y="96" />
                <rect fill="#ffffff" height="20" rx="3" width="20" x="17" y="103" />
                <rect fill="#9b2f00" height="10" rx="2" width="10" x="22" y="108" />
                <rect fill="#1b1c1a" height="8" rx="2" width="8" x="52" y="12" />
                <rect fill="#1b1c1a" height="6" rx="2" width="14" x="68" y="12" />
                <rect fill="#1b1c1a" height="16" rx="2" width="6" x="52" y="26" />
                <rect fill="#1b1c1a" height="8" rx="2" width="8" x="64" y="24" />
                <rect fill="#1b1c1a" height="12" rx="2" width="8" x="78" y="24" />
                <rect fill="#1b1c1a" height="8" rx="2" width="10" x="12" y="52" />
                <rect fill="#1b1c1a" height="6" rx="2" width="14" x="28" y="52" />
                <rect fill="#1b1c1a" height="14" rx="2" width="8" x="14" y="68" />
                <rect fill="#1b1c1a" height="6" rx="2" width="12" x="30" y="66" />
                <rect fill="#1b1c1a" height="8" rx="2" width="8" x="32" y="78" />
                <rect fill="#1b1c1a" height="6" rx="2" width="12" x="98" y="52" />
                <rect fill="#1b1c1a" height="10" rx="2" width="12" x="116" y="52" />
                <rect fill="#1b1c1a" height="14" rx="2" width="8" x="98" y="66" />
                <rect fill="#1b1c1a" height="8" rx="2" width="16" x="112" y="70" />
                <rect fill="#1b1c1a" height="12" rx="2" width="10" x="52" y="96" />
                <rect fill="#1b1c1a" height="6" rx="2" width="14" x="68" y="96" />
                <rect fill="#1b1c1a" height="12" rx="2" width="14" x="52" y="116" />
                <rect fill="#1b1c1a" height="18" rx="2" width="10" x="72" y="110" />
                <rect fill="#1b1c1a" height="6" rx="2" width="14" x="96" y="96" />
                <rect fill="#1b1c1a" height="10" rx="2" width="12" x="116" y="96" />
                <rect fill="#1b1c1a" height="18" rx="2" width="10" x="96" y="110" />
                <rect fill="#1b1c1a" height="14" rx="2" width="16" x="112" y="114" />
                <circle cx="70" cy="70" fill="#fbf9f6" r="16" stroke="#9b2f00" strokeWidth="2" />
                <path
                  d="M66 64L74 64M70 64V76M66 76H74"
                  stroke="#9b2f00"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          )}

          {/* Pending VietQR Code */}
          {isPending && (
            <div className="p-3 bg-surface-container-lowest rounded-DEFAULT shadow-sm mb-2 flex items-center justify-center">
              <svg className="w-36 h-36" fill="none" viewBox="0 0 140 140">
                <rect fill="#1b1c1a" height="34" rx="6" width="34" x="10" y="10" />
                <rect fill="#ffffff" height="20" rx="3" width="20" x="17" y="17" />
                <rect fill="#c2410c" height="10" rx="2" width="10" x="22" y="22" />
                <rect fill="#1b1c1a" height="34" rx="6" width="34" x="96" y="10" />
                <rect fill="#ffffff" height="20" rx="3" width="20" x="103" y="17" />
                <rect fill="#c2410c" height="10" rx="2" width="10" x="108" y="22" />
                <rect fill="#1b1c1a" height="34" rx="6" width="34" x="10" y="96" />
                <rect fill="#ffffff" height="20" rx="3" width="20" x="17" y="103" />
                <rect fill="#c2410c" height="10" rx="2" width="10" x="22" y="108" />
                <rect fill="#1b1c1a" height="12" rx="2" width="12" x="52" y="18" />
                <rect fill="#1b1c1a" height="16" rx="2" width="8" x="74" y="14" />
                <rect fill="#1b1c1a" height="8" rx="2" width="16" x="54" y="38" />
                <rect fill="#1b1c1a" height="10" rx="2" width="10" x="76" y="34" />
                <rect fill="#1b1c1a" height="8" rx="2" width="18" x="14" y="54" />
                <rect fill="#1b1c1a" height="18" rx="2" width="8" x="14" y="70" />
                <rect fill="#1b1c1a" height="12" rx="2" width="12" x="30" y="66" />
                <rect fill="#1b1c1a" height="18" rx="2" width="10" x="98" y="54" />
                <rect fill="#1b1c1a" height="8" rx="2" width="14" x="114" y="58" />
                <rect fill="#1b1c1a" height="14" rx="2" width="18" x="110" y="74" />
                <rect fill="#1b1c1a" height="10" rx="2" width="16" x="54" y="98" />
                <rect fill="#1b1c1a" height="18" rx="2" width="8" x="76" y="98" />
                <rect fill="#1b1c1a" height="12" rx="2" width="10" x="54" y="116" />
                <rect fill="#1b1c1a" height="8" rx="2" width="14" x="70" y="120" />
                <circle cx="70" cy="70" fill="#ffdbcc" r="14" />
                <text fill="#76340e" fontSize="9" fontWeight="bold" textAnchor="middle" x="70" y="74">
                  QR PAY
                </text>
              </svg>
            </div>
          )}

          {/* Completed Icon Box */}
          {isCompleted && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-primary-container mb-2">
                <span className="material-symbols-outlined text-[32px]">rate_review</span>
              </div>
              <h4 className="font-headline-sm text-[18px] text-on-surface mb-1">
                Đánh giá kỳ nghỉ
              </h4>
              <p className="font-body-md text-[12px] text-on-surface-variant">
                Chia sẻ đánh giá thực tế của bạn để giúp cộng đồng du khách có trải nghiệm tốt hơn.
              </p>
            </div>
          )}

          {/* Cancelled Icon Box */}
          {isCancelled && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-2">
                <span className="material-symbols-outlined text-[32px]">block</span>
              </div>
              <h4 className="font-headline-sm text-[18px] text-on-surface mb-1">
                Đơn đã hủy
              </h4>
              <p className="font-body-md text-[12px] text-on-surface-variant">
                Đã xử lý hoàn tiền vào ngày 05/01/2025.
              </p>
            </div>
          )}

          <p className="font-label-sm text-[11px] text-on-surface-variant font-medium mt-1">
            {booking.qrCaption}
          </p>
        </div>

        {/* Ticket Action Buttons */}
        <div className="w-full flex flex-col gap-2 pt-4">
          {/* Confirmed actions */}
          {isConfirmed && (
            <>
              <button
                onClick={() => alert(`Xem chi tiết vé điện tử đơn ${booking.bookingCode}`)}
                className="w-full py-2.5 px-4 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                <span>Chi tiết đơn &amp; Vé điện tử</span>
              </button>

              <div className="relative group w-full">
                <button
                  onClick={() => onOpenCancelModal(booking)}
                  className="w-full py-2 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-error">cancel</span>
                  <span>Hủy đặt phòng</span>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center w-56 z-20 pointer-events-none">
                  <div className="bg-inverse-surface text-inverse-on-surface font-label-sm text-[11px] p-2 rounded shadow-lg text-center">
                    {booking.cancellationPolicyNotice || 'Hủy miễn phí hoàn 100% trước giờ quy định'}
                  </div>
                  <div className="w-2 h-2 bg-inverse-surface rotate-45 -mt-1" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-1">
                <a
                  href="#pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Đang tải vé PDF cho mã đặt phòng ${booking.bookingCode}`);
                  }}
                  className="font-label-sm text-[11px] text-outline hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span> Tải PDF
                </a>
                <span className="text-outline-variant">|</span>
                <a
                  href="#apple-wallet"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Thêm vé ${booking.bookingCode} vào Apple Wallet`);
                  }}
                  className="font-label-sm text-[11px] text-outline hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">wallet</span> Apple Wallet
                </a>
              </div>
            </>
          )}

          {/* Pending actions */}
          {isPending && (
            <>
              <button
                onClick={() => onPayNow?.(booking)}
                className="w-full py-2.5 px-4 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">payment</span>
                <span>Thanh toán ngay ({booking.totalAmount.toLocaleString('vi-VN')}đ)</span>
              </button>

              <button
                onClick={() => onOpenCancelModal(booking)}
                className="w-full py-2 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Hủy đặt phòng này</span>
              </button>
            </>
          )}

          {/* Completed actions */}
          {isCompleted && (
            <>
              <button
                onClick={() => onOpenReviewModal(booking)}
                className="w-full py-2.5 px-4 rounded-full bg-surface-container-lowest text-primary-container font-label-lg text-label-lg border-2 border-primary-container/20 hover:border-primary-container shadow-sm hover:bg-primary-container hover:text-on-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span>Viết đánh giá kỳ nghỉ</span>
              </button>

              <button
                onClick={() => onRebook?.(booking)}
                className="w-full py-2 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Đặt lại chỗ này</span>
              </button>

              <a
                href="#vat"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Tải hóa đơn VAT cho đơn ${booking.bookingCode}`);
                }}
                className="font-label-sm text-[11px] text-outline hover:text-primary transition-colors flex items-center justify-center gap-1 pt-1"
              >
                <span className="material-symbols-outlined text-[14px]">receipt</span> Tải hóa đơn điện tử VAT
              </a>
            </>
          )}

          {/* Cancelled actions */}
          {isCancelled && (
            <button
              onClick={() => onRebook?.(booking)}
              className="w-full py-2 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">travel_explore</span>
              <span>Tìm khách sạn khác</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
