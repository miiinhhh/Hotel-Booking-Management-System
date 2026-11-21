import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../auth/permissions';
import { StaffBooking } from '../types';
import { PAYMENT_UI, PaidBar, shortDate, StatusBadge, vnd } from './staffUi';

interface StaffBookingTableProps {
  bookings: StaffBooking[];
  onViewDetails: (booking: StaffBooking) => void;
  onQuickCheckIn: (booking: StaffBooking) => void;
  onQuickConfirmBooking: (booking: StaffBooking) => void;
  loading?: boolean;
}

/**
 * Danh sách đơn: 6 cột gọn (Đơn · Khách · Phòng · Lưu trú · Thanh toán · Trạng thái) + thao tác.
 * Cả dòng bấm được để mở chi tiết; chỉ hiện một nút thao tác nhanh đúng bước tiếp theo.
 */
export const StaffBookingTable: React.FC<StaffBookingTableProps> = ({
  bookings, onViewDetails, onQuickCheckIn, onQuickConfirmBooking, loading,
}) => {
  const { hasPermission } = useAuth();
  const canManageBooking = hasPermission(PERMISSIONS.bookingManage);

  const quickAction = (b: StaffBooking) => {
    if (!canManageBooking) return null;
    if (b.status === 'pending_deposit') return { label: 'Xác nhận', icon: 'check_circle', run: () => onQuickConfirmBooking(b) };
    if (b.status === 'confirmed_deposit') return { label: 'Check-in', icon: 'how_to_reg', run: () => onQuickCheckIn(b) };
    return null;
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-outline-variant/40 bg-surface-container-low text-xs text-on-surface-variant">
            <tr>
              <th scope="col" className="py-3 pl-5 pr-3 font-semibold">Đơn</th>
              <th scope="col" className="px-3 py-3 font-semibold">Khách hàng</th>
              <th scope="col" className="px-3 py-3 font-semibold">Phòng</th>
              <th scope="col" className="px-3 py-3 font-semibold">Lưu trú</th>
              <th scope="col" className="px-3 py-3 font-semibold">Thanh toán</th>
              <th scope="col" className="px-3 py-3 font-semibold">Trạng thái</th>
              <th scope="col" className="py-3 pl-3 pr-5"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">{loading ? 'hourglass_empty' : 'inbox'}</span>
                  <p className="mt-2 font-medium text-on-surface">{loading ? 'Đang tải đơn đặt phòng…' : 'Không có đơn phù hợp'}</p>
                  {!loading && <p className="mt-1 text-xs text-on-surface-variant">Thử đổi từ khóa, trạng thái hoặc phân khu.</p>}
                </td>
              </tr>
            ) : bookings.map(b => {
              const cancelled = b.status === 'cancelled';
              const action = quickAction(b);
              const pay = PAYMENT_UI[b.depositStatus];
              return (
                <tr key={b.id} onClick={() => onViewDetails(b)}
                  className={`cursor-pointer transition-colors hover:bg-surface-container-low/60 ${cancelled ? 'opacity-60' : ''}`}>
                  {/* Đơn */}
                  <td className="py-3.5 pl-5 pr-3 align-middle">
                    <p className={`font-semibold ${cancelled ? 'text-on-surface-variant line-through' : 'text-primary'}`}>{b.bookingCode}</p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">{b.createdAt}</p>
                  </td>
                  {/* Khách */}
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/50 text-xs font-bold text-primary">{b.customerInitials}</span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 font-medium text-on-surface">
                          <span className="truncate">{b.customerName}</span>
                          {b.specialRequests?.trim() && (
                            <span className="material-symbols-outlined shrink-0 text-[16px] text-amber-700" title={`Yêu cầu: ${b.specialRequests}`} aria-label="Có yêu cầu đặc biệt">sticky_note_2</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-on-surface-variant">{b.customerPhone}</p>
                      </div>
                    </div>
                  </td>
                  {/* Phòng */}
                  <td className="px-3 py-3.5 align-middle">
                    <p className="font-semibold text-on-surface">{b.roomNumber}</p>
                    <p className="max-w-[200px] truncate text-xs text-on-surface-variant" title={`${b.roomType} · ${b.zone}`}>{b.roomType} · {b.zone}</p>
                  </td>
                  {/* Lưu trú */}
                  <td className="px-3 py-3.5 align-middle">
                    <p className="font-medium text-on-surface">{shortDate(b.checkInDate)} → {shortDate(b.checkOutDate)}</p>
                    <p className="text-xs text-on-surface-variant">{b.nightsCount} đêm · {b.roomDetails}</p>
                  </td>
                  {/* Thanh toán */}
                  <td className="w-[180px] px-3 py-3.5 align-middle">
                    <p className="font-semibold tabular-nums text-on-surface">{vnd(b.totalAmount)}</p>
                    {!cancelled && <div className="mt-1.5"><PaidBar paid={b.paidAmount} total={b.totalAmount} /></div>}
                    <p className={`mt-1 text-xs ${pay.className}`}>
                      {b.depositStatus === 'deposited_50' ? `Đã thu ${vnd(b.paidAmount)}` : pay.label}
                    </p>
                  </td>
                  {/* Trạng thái */}
                  <td className="px-3 py-3.5 align-middle"><StatusBadge status={b.status} /></td>
                  {/* Thao tác */}
                  <td className="py-3.5 pl-3 pr-5 text-right align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {action && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); action.run(); }}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary hover:opacity-90">
                          <span className="material-symbols-outlined text-[16px]">{action.icon}</span>{action.label}
                        </button>
                      )}
                      <span className="material-symbols-outlined text-[20px] text-outline" aria-hidden="true">chevron_right</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
