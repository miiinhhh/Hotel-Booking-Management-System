import React from 'react';
import { StaffBooking } from '../types';

interface StaffBookingTableProps {
  bookings: StaffBooking[];
  onViewDetails: (booking: StaffBooking) => void;
  onQuickCheckIn: (booking: StaffBooking) => void;
  onQuickConfirmDeposit: (booking: StaffBooking) => void;
}

export const StaffBookingTable: React.FC<StaffBookingTableProps> = ({
  bookings,
  onViewDetails,
  onQuickCheckIn,
  onQuickConfirmDeposit,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT shadow-[0_4px_24px_-2px_rgba(120,53,15,0.04)] border border-[#eae8e5] overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[1150px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-[#eae8e5] text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wider">
              <th className="py-4 pl-6 pr-3 w-[130px] text-left" scope="col">
                Mã Booking
              </th>
              <th className="py-4 px-3 w-[220px] text-left" scope="col">
                Khách hàng &amp; Liên hệ
              </th>
              <th className="py-4 px-3 w-[150px] text-left" scope="col">
                Phân khu &amp; Phòng
              </th>
              <th className="py-4 px-3 w-[190px] text-left" scope="col">
                Hạng phòng
              </th>
              <th className="py-4 px-3 w-[170px] text-left" scope="col">
                Thời gian lưu trú
              </th>
              <th className="py-4 px-3 w-[160px] text-left" scope="col">
                Tài chính &amp; Cọc
              </th>
              <th className="py-4 px-3 w-[150px] text-center" scope="col">
                Trạng thái
              </th>
              <th className="py-4 px-3 w-[120px] text-center" scope="col">
                Thanh toán
              </th>
              <th className="py-4 pr-6 pl-3 w-[150px] text-right" scope="col">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eae8e5]">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[36px] text-outline">
                      folder_open
                    </span>
                    <p className="font-label-md text-label-md">Không tìm thấy đơn đặt phòng nào</p>
                    <p className="font-label-sm text-xs text-outline">
                      Vui lòng thử thay đổi từ khóa hoặc bộ lọc phân khu/trạng thái.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const isCancelled = booking.status === 'cancelled';
                const isPending = booking.status === 'pending_deposit';
                const isConfirmed = booking.status === 'confirmed_deposit';
                const isCheckedIn = booking.status === 'checked_in';
                const isStaying = booking.status === 'staying';

                return (
                  <tr
                    key={booking.id}
                    className={`group hover:bg-surface-container-low/60 transition-colors ${
                      isPending ? 'bg-amber-50/20' : ''
                    } ${isCancelled ? 'opacity-70 hover:opacity-100' : ''}`}
                  >
                    {/* Mã Booking */}
                    <td className="py-4 pl-6 pr-3 align-middle">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => onViewDetails(booking)}
                          className={`font-headline-sm text-body-lg font-bold tracking-tight text-left cursor-pointer hover:underline ${
                            isCancelled ? 'text-outline line-through' : 'text-primary'
                          }`}
                        >
                          {booking.bookingCode}
                        </button>
                        <span className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">
                          {booking.createdAt}
                        </span>
                      </div>
                    </td>

                    {/* Khách hàng & Liên hệ */}
                    <td className="py-4 px-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-secondary font-label-md shrink-0 border border-[#eae8e5]">
                          {booking.customerInitials}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`font-label-lg text-label-lg text-on-surface font-semibold leading-snug ${
                              isCancelled ? 'line-through text-on-surface-variant' : ''
                            }`}
                          >
                            {booking.customerName}
                          </span>
                          <span className="font-label-sm text-[12px] text-on-surface-variant">
                            {booking.customerPhone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phân khu & Phòng */}
                    <td className="py-4 px-3 align-middle">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface border border-[#eae8e5]">
                        <span className="font-semibold text-secondary">{booking.zone}</span>
                        <span className="text-outline">·</span>
                        <span className={`font-bold ${isPending ? 'text-primary' : 'text-on-surface'}`}>
                          {booking.roomNumber}
                        </span>
                      </div>
                    </td>

                    {/* Hạng phòng */}
                    <td className="py-4 px-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold leading-snug">
                          {booking.roomType}
                        </span>
                        <span className="font-label-sm text-[11px] text-on-surface-variant">
                          {booking.roomDetails}
                        </span>
                      </div>
                    </td>

                    {/* Thời gian lưu trú */}
                    <td className="py-4 px-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-medium">
                          {booking.checkInDate} — {booking.checkOutDate}
                        </span>
                        <span
                          className={`font-label-sm text-[11px] font-semibold ${
                            isCancelled ? 'text-error' : 'text-secondary'
                          }`}
                        >
                          {booking.nightsLabel}
                        </span>
                      </div>
                    </td>

                    {/* Tài chính & Cọc */}
                    <td className="py-4 px-3 align-middle">
                      <div className="flex flex-col">
                        <span
                          className={`font-label-md text-label-md font-bold ${
                            isCancelled
                              ? 'text-outline'
                              : isPending
                              ? 'text-tertiary-container'
                              : 'text-primary'
                          }`}
                        >
                          {booking.totalAmount > 0
                            ? `${booking.totalAmount.toLocaleString('vi-VN')}₫`
                            : '0₫'}
                        </span>
                        {isPending && booking.depositDeadline ? (
                          <span className="font-label-sm text-[11px] text-amber-800 font-semibold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">timer</span>{' '}
                            {booking.depositDeadline}
                          </span>
                        ) : isCancelled ? (
                          <span className="font-label-sm text-[11px] text-on-surface-variant">
                            Hủy bởi khách
                          </span>
                        ) : booking.paidAmount === booking.totalAmount ? (
                          <span className="font-label-sm text-[11px] text-secondary font-medium">
                            Đã thanh toán đủ
                          </span>
                        ) : (
                          <span className="font-label-sm text-[11px] text-emerald-800 font-medium">
                            Đã cọc {booking.paidAmount.toLocaleString('vi-VN')}₫
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 px-3 text-center align-middle">
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-label-sm text-[11px] font-semibold border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          {booking.statusLabel}
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-label-sm text-[11px] font-bold border border-amber-200/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                          {booking.statusLabel}
                        </span>
                      )}
                      {isCheckedIn && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-label-sm text-[11px] font-semibold border border-blue-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {booking.statusLabel}
                        </span>
                      )}
                      {isStaying && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-label-sm text-[11px] font-semibold border border-blue-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {booking.statusLabel}
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-outline font-label-sm text-[11px] font-semibold border border-[#eae8e5]">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                          {booking.statusLabel}
                        </span>
                      )}
                    </td>

                    {/* Thanh toán */}
                    <td className="py-4 px-3 text-center align-middle">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-[11px] font-medium border border-[#eae8e5]">
                        {booking.depositStatusLabel}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 pr-6 pl-3 text-right align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDetails(booking)}
                          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                          title="Xem chi tiết đơn"
                        >
                          <span className="material-symbols-outlined text-[19px]">visibility</span>
                        </button>

                        {isConfirmed && (
                          <button
                            type="button"
                            onClick={() => onQuickCheckIn(booking)}
                            className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary hover:bg-tertiary-container font-label-sm text-[12px] font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            title="Thực hiện nhận phòng"
                          >
                            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                            <span>Check-in</span>
                          </button>
                        )}

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => onQuickConfirmDeposit(booking)}
                            className="px-3.5 py-1.5 rounded-full bg-secondary-fixed text-on-secondary-fixed hover:bg-primary-container hover:text-on-primary font-label-sm text-[12px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Xác nhận cọc chuyển khoản"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>Xác nhận cọc</span>
                          </button>
                        )}

                        {isCheckedIn && (
                          <button
                            type="button"
                            onClick={() => onViewDetails(booking)}
                            className="px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-secondary font-label-sm text-[12px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Dịch vụ phòng"
                          >
                            <span className="material-symbols-outlined text-[16px]">room_service</span>
                            <span>Dịch vụ</span>
                          </button>
                        )}

                        {isStaying && (
                          <button
                            type="button"
                            onClick={() => alert(`In phiếu xác nhận cho đơn ${booking.bookingCode}`)}
                            className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="In phiếu xác nhận"
                          >
                            <span className="material-symbols-outlined text-[19px]">print</span>
                          </button>
                        )}

                        {isCancelled && (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-full bg-surface-container-low text-outline cursor-not-allowed font-label-sm text-[12px] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">block</span>
                            <span>Đã hủy</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
