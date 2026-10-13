import React, { useState, useEffect } from 'react';
import { StaffBooking } from '../types';

interface BookingDetailDrawerProps {
  booking: StaffBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: (booking: StaffBooking) => void;
  onCancelBooking: (booking: StaffBooking) => void;
  onUpdateNotes?: (bookingId: string, notes: string, approval: 'accepted' | 'rejected') => void;
}

export const BookingDetailDrawer: React.FC<BookingDetailDrawerProps> = ({
  booking,
  isOpen,
  onClose,
  onCheckIn,
  onCancelBooking,
  onUpdateNotes,
}) => {
  const [copied, setCopied] = useState(false);
  const [printDepositClicked, setPrintDepositClicked] = useState(false);
  const [approvalState, setApprovalState] = useState<'accepted' | 'rejected'>(
    booking?.approvalStatus === 'rejected' ? 'rejected' : 'accepted'
  );
  const [internalNotes, setInternalNotes] = useState(booking?.internalNotes || '');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInDone, setCheckInDone] = useState(booking?.status === 'checked_in');

  useEffect(() => {
    if (booking) {
      setApprovalState(booking.approvalStatus === 'rejected' ? 'rejected' : 'accepted');
      setInternalNotes(
        booking.internalNotes ||
          'Đã xếp phòng theo nguyện vọng của khách, buồng phòng đã kiểm tra buồng trước giờ check-in.'
      );
      setCheckInDone(booking.status === 'checked_in');
      setPrintDepositClicked(false);
      setCopied(false);
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(booking.bookingCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprovalToggle = (accepted: boolean) => {
    const newState = accepted ? 'accepted' : 'rejected';
    setApprovalState(newState);

    let updatedNote = internalNotes;
    if (accepted) {
      updatedNote = `Đã xếp ${booking.roomNumber} theo đúng nguyện vọng của khách, buồng phòng đã chuẩn bị trước giờ nhận phòng.`;
    } else {
      updatedNote =
        'Kính gửi quý khách: Hiện yêu cầu đặc biệt chưa đáp ứng được do quỹ tiện ích đang đầy. Lễ tân đã chuẩn bị phương án dự phòng thay thế.';
    }
    setInternalNotes(updatedNote);
    onUpdateNotes?.(booking.id, updatedNote, newState);
  };

  const handleExecuteCheckIn = () => {
    setIsCheckingIn(true);
    setTimeout(() => {
      setIsCheckingIn(false);
      setCheckInDone(true);
      onCheckIn(booking);
    }, 1200);
  };

  const handleRoomSwitch = () => {
    alert(`Mở sơ đồ phòng khả dụng tại ${booking.zone} cho kỳ lưu trú ${booking.checkInDate} - ${booking.checkOutDate}.`);
  };

  const handleCancelClick = () => {
    const confirmCancel = window.confirm(
      `Quy định hủy: Đơn ${booking.bookingCode} (Đã cọc ${booking.paidAmount.toLocaleString('vi-VN')}₫). Bạn có chắc muốn xử lý hủy booking này không?`
    );
    if (confirmCancel) {
      onCancelBooking(booking);
    }
  };

  return (
    <>
      {/* Ambient Backdrop Scrim */}
      <div
        className="fixed inset-0 bg-inverse-surface/35 backdrop-blur-[3px] z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Detail Drawer */}
      <section
        aria-labelledby="booking-code-heading"
        aria-modal="true"
        role="dialog"
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-surface-bright z-50 flex flex-col shadow-[0_20px_48px_-6px_rgba(39,34,30,0.18)] transition-transform duration-300 overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* DRAWER HEADER */}
        <header className="p-6 md:px-8 md:pt-7 md:pb-6 bg-surface-container-lowest shadow-sm flex flex-col gap-3 relative border-b border-[#eae8e5]">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h2
                  className="font-headline-md text-headline-md text-on-surface tracking-tight"
                  id="booking-code-heading"
                >
                  {booking.bookingCode}
                </h2>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                  title="Sao chép mã đặt phòng"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm tracking-wide ${
                    checkInDone || booking.status === 'checked_in'
                      ? 'bg-blue-50 text-blue-800'
                      : booking.status === 'confirmed_deposit'
                      ? 'bg-[#1b4332]/10 text-[#2d6a4f]'
                      : booking.status === 'pending_deposit'
                      ? 'bg-amber-50 text-amber-800'
                      : booking.status === 'staying'
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      checkInDone || booking.status === 'checked_in'
                        ? 'bg-blue-600'
                        : booking.status === 'confirmed_deposit'
                        ? 'bg-[#2d6a4f]'
                        : booking.status === 'pending_deposit'
                        ? 'bg-amber-600 animate-pulse'
                        : 'bg-outline'
                    }`}
                  />
                  {checkInDone ? 'ĐÃ CHECK-IN' : booking.statusLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-on-surface-variant font-body-md text-body-md">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                  Phân khu:{' '}
                  <strong className="text-on-surface font-semibold">
                    {booking.zone} · {booking.roomNumber}
                  </strong>
                </span>
                <span className="text-outline-variant font-body-md">•</span>
                <span className="font-label-md text-label-md text-secondary">
                  {booking.roomType}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng chi tiết"
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Tạo lúc: {booking.createdAt}
            </div>
            <div className="inline-flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full font-label-sm text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-primary">
                verified_user
              </span>
              Lễ tân: {booking.receptionist}
            </div>
          </div>
        </header>

        {/* DRAWER SCROLLABLE BODY (3 Cards) */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">
          {/* CARD 1: THÔNG TIN KHÁCH HÀNG & LƯU TRÚ */}
          <article className="bg-surface-container-lowest p-6 md:p-7 rounded-lg shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] border border-[#eae8e5]">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Thông tin khách hàng &amp; Lưu trú
                </h3>
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                {booking.vipLevel}
              </span>
            </div>

            {/* Customer Identity Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-surface-container-low p-4 rounded-DEFAULT">
                <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">
                  Họ và tên khách
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface block mt-1">
                  {booking.customerName}
                </span>
                <span className="font-label-sm text-label-sm text-secondary-container bg-surface-container-highest/60 px-2 py-0.5 rounded-full inline-block mt-2">
                  {booking.membershipTier}
                </span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-DEFAULT space-y-2">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">
                    Số điện thoại
                  </span>
                  <a
                    className="font-label-lg text-label-lg text-primary hover:underline block mt-0.5"
                    href={`tel:${booking.customerPhone}`}
                  >
                    {booking.customerPhone}
                  </a>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase tracking-wider">
                    Email liên hệ
                  </span>
                  <span className="font-body-md text-body-md text-on-surface block truncate">
                    {booking.customerEmail}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 bg-surface-container-low px-4 py-3 rounded-DEFAULT flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                CCCD / Số Hộ Chiếu
              </span>
              <span className="font-label-lg text-label-lg text-on-surface font-semibold tracking-widest">
                {booking.customerCccd}
              </span>
            </div>

            {/* Accommodation Details */}
            <div className="mt-5 pt-4 bg-surface-container/50 p-4 rounded-DEFAULT space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Hạng phòng &amp; Bố trí
                  </span>
                  <p className="font-headline-sm text-headline-sm text-on-surface text-[18px] leading-6 mt-1">
                    {booking.roomType}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    {booking.roomDetails}
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-surface-container-lowest font-label-md text-label-md text-on-surface shadow-sm">
                  01 phòng • 2 lớn, 1 trẻ em
                </span>
              </div>

              {/* Schedule Range Banner */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-surface-container-lowest p-3 rounded-DEFAULT">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase">
                    Ngày đến (Check-in)
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface block font-semibold mt-0.5">
                    {booking.checkInDate}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary">
                    {booking.checkInTime || 'từ 14:00'}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-3 rounded-DEFAULT">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase">
                    Ngày đi (Check-out)
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface block font-semibold mt-0.5">
                    {booking.checkOutDate}
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary">
                    {booking.checkOutTime || 'trước 12:00'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center pt-1 font-label-sm text-label-sm text-on-surface-variant gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>
                Thời lượng lưu trú trọn gói:{' '}
                <strong className="text-on-surface">{booking.nightsLabel}</strong>
              </div>
            </div>
          </article>

          {/* CARD 2: THANH TOÁN & ĐẶT CỌC */}
          <article className="bg-surface-container-lowest p-6 md:p-7 rounded-lg shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] border border-[#eae8e5]">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Thanh toán &amp; Đặt cọc
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Bao gồm VAT &amp; Phí DV (15%)
              </span>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-3 pt-1">
              <div className="flex items-baseline justify-between p-3.5 rounded-DEFAULT bg-surface-container-low">
                <span className="font-body-md text-body-md text-on-surface-variant">
                  Tổng giá trị đơn đặt phòng
                </span>
                <span className="font-headline-md text-headline-md text-on-surface">
                  {booking.totalAmount > 0
                    ? `${booking.totalAmount.toLocaleString('vi-VN')}₫`
                    : '0₫'}
                </span>
              </div>

              {booking.paidAmount > 0 && (
                <div className="p-4 rounded-DEFAULT bg-[#1b4332]/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#2d6a4f] font-semibold">
                        Đã cọc trực tuyến ({Math.round((booking.paidAmount / booking.totalAmount) * 100)}%)
                      </span>
                      <p className="font-headline-sm text-headline-sm text-[#1b4332] mt-0.5">
                        {booking.paidAmount.toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Mã giao dịch
                      </span>
                      <code className="font-label-md text-label-md text-on-surface font-semibold bg-surface-container-lowest px-2.5 py-1 rounded-full">
                        {booking.transactionCode || 'VNPAY-8839210'}
                      </code>
                    </div>
                  </div>

                  {/* Deposit Verification Status Indicator */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-[#2d6a4f] font-label-md text-label-md">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <span>Đã đối soát cọc thành công với cổng thanh toán</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintDepositClicked(true)}
                      className="px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors shadow-sm cursor-pointer"
                    >
                      {printDepositClicked ? 'Đã in phiếu cọc' : 'In phiếu cọc'}
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Balance at Check-in */}
              <div className="p-4 rounded-DEFAULT bg-primary-fixed/30 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-fixed font-semibold">
                    Cần thu khi check-in
                  </span>
                  <p className="font-headline-sm text-headline-sm text-primary">
                    {booking.remainingAmount.toLocaleString('vi-VN')}₫
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Tiền mặt hoặc quẹt thẻ POS khi bàn giao khóa phòng
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                </div>
              </div>
            </div>
          </article>

          {/* CARD 3: YÊU CẦU ĐẶC BIỆT CỦA KHÁCH */}
          <article className="bg-surface-container-lowest p-6 md:p-7 rounded-lg shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] space-y-4 border border-[#eae8e5]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[18px]">room_service</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Yêu cầu đặc biệt của khách
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-semibold uppercase">
                Độ ưu tiên cao
              </span>
            </div>

            {/* Recorded Guest Request */}
            <div className="bg-surface-container-low p-4 rounded-DEFAULT flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                format_quote
              </span>
              <p className="font-body-lg text-body-lg text-on-surface italic leading-relaxed">
                {booking.specialRequests || 'Khách không có yêu cầu đặc biệt bổ sung.'}
              </p>
            </div>

            {/* Interactive Quick Response Toggles */}
            <div className="space-y-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                Phản hồi của bộ phận tiền sảnh:
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleApprovalToggle(true)}
                  className={`flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                    approvalState === 'accepted'
                      ? 'bg-[#2d6a4f] text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-[#1b4332]/10 hover:text-[#2d6a4f]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Chấp thuận yêu cầu</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovalToggle(false)}
                  className={`flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                    approvalState === 'rejected'
                      ? 'bg-error text-on-error shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-error'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Từ chối</span>
                </button>
              </div>
            </div>

            {/* Internal Notes Textarea */}
            <div className="space-y-1.5 pt-1">
              <label
                className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block"
                htmlFor="internal-response-notes"
              >
                Ghi chú điều phối nội bộ / Buồng phòng:
              </label>
              <textarea
                id="internal-response-notes"
                rows={3}
                value={internalNotes}
                onChange={(e) => {
                  setInternalNotes(e.target.value);
                  onUpdateNotes?.(booking.id, e.target.value, approvalState);
                }}
                className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md rounded-DEFAULT p-3.5 outline-none focus:bg-surface-container-lowest transition-colors shadow-inner resize-none border border-outline-variant/30"
                placeholder="Nhập ghi chú cho buồng phòng hoặc lý do từ chối..."
              />
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm px-1">
                <span>Cập nhật lần cuối: {booking.lastUpdated || '08:30 bởi Buồng phòng Trưởng'}</span>
                <span className="text-primary font-semibold">Đã lưu tự động</span>
              </div>
            </div>
          </article>
        </div>

        {/* 3. BOTTOM STICKY ACTION BAR */}
        <footer className="p-4 md:px-8 bg-surface-container-lowest shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 border-t border-[#eae8e5]">
          {/* Left Utility Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRoomSwitch}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              <span>Đổi lịch / Đổi phòng</span>
            </button>
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={booking.status === 'cancelled'}
              className="px-4 py-2.5 rounded-full bg-error-container/40 text-error hover:bg-error-container hover:text-on-error-container transition-colors font-label-md text-label-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mở bảng tính toán phí hủy phạt theo chính sách"
            >
              <span className="material-symbols-outlined text-[18px]">block</span>
              <span>Hủy booking</span>
            </button>
          </div>

          {/* Primary Action Button */}
          {checkInDone ? (
            <div className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#1b4332] text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2.5 shadow-md">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Đã hoàn tất Check-in ({booking.roomNumber})</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExecuteCheckIn}
              disabled={isCheckingIn || booking.status === 'cancelled'}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-primary-container hover:bg-tertiary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2.5 shadow-[0_4px_16px_rgba(194,65,12,0.25)] transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingIn ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang tạo thẻ khóa {booking.roomNumber}...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">key</span>
                  <span>Check-in khách • {booking.roomNumber}</span>
                </>
              )}
            </button>
          )}
        </footer>
      </section>
    </>
  );
};
