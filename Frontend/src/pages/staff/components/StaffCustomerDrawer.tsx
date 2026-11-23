import React, { useEffect } from 'react';
import { StaffCustomer } from '../types';
import { TierBadge } from './staffUi';

interface StaffCustomerDrawerProps {
  customer: StaffCustomer | null;
  onClose?: () => void;
}

const viDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/**
 * Hồ sơ khách (chỉ xem): liên hệ, yêu cầu từ các lần đặt, lịch sử gần nhất.
 * Chỉ hiển thị dữ liệu máy chủ thật sự trả về; nút thao tác dùng liên kết gọi/email của thiết bị.
 */

/** Trạng thái đơn từ máy chủ → nhãn tiếng Việt. */
const BOOKING_STATUS_VI: Record<string, string> = {
  Pending: 'Chờ xác nhận', Confirmed: 'Đã xác nhận', CheckedIn: 'Đang lưu trú', CheckedOut: 'Đã trả phòng',
  Completed: 'Hoàn tất', Cancelled: 'Đã hủy', NoShow: 'Không đến',
};

export const StaffCustomerDrawer: React.FC<StaffCustomerDrawerProps> = ({ customer, onClose }) => {
  useEffect(() => {
    if (!customer || !onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customer, onClose]);

  if (!customer) return null;

  const hasPhone = Boolean(customer.phone) && customer.phone !== 'Chưa cập nhật';
  const dialable = customer.phone.replace(/[^+\d]/g, '');
  const label = 'text-xs text-on-surface-variant';
  const section = 'border-b border-outline-variant/40 px-6 py-5 last:border-b-0';

  return (
    <>
      <button type="button" aria-label="Đóng hồ sơ khách hàng" onClick={onClose} className="fixed inset-0 z-[60] bg-inverse-surface/30 backdrop-blur-[1px]" />
      <aside role="dialog" aria-modal="true" aria-label={`Hồ sơ khách hàng ${customer.name}`}
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-surface-container-lowest shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Đầu panel */}
        <header className="border-b border-outline-variant/40 px-6 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-lg font-bold text-primary">
                {customer.initials}
                {customer.isStaying && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-600 ring-2 ring-surface-container-lowest" title="Đang lưu trú" />}
              </span>
              <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-on-surface">
                  <span className="truncate">{customer.name}</span><TierBadge tier={customer.tier} />
                </h2>
                <p className="mt-0.5 text-sm text-on-surface-variant">{customer.customerCode} · khách từ {customer.memberSinceYear}</p>
              </div>
            </div>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Đóng"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {customer.isStaying && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Đang lưu trú{customer.currentRoom ? ` · ${customer.currentRoom}` : ''}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {hasPhone && (
              <a href={`tel:${dialable}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-outline-variant py-2 text-sm font-semibold hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px] text-primary">call</span>Gọi điện
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-outline-variant py-2 text-sm font-semibold hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px] text-primary">mail</span>Gửi email
              </a>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Liên hệ */}
          <div className={section}>
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Thông tin liên hệ</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className={label}>Số điện thoại</dt><dd className="font-medium text-on-surface">{customer.phone}</dd></div>
              <div><dt className={label}>Ngày sinh</dt><dd className="font-medium text-on-surface">{customer.birthDate ? viDate(customer.birthDate) : 'Chưa cập nhật'}</dd></div>
              <div className="col-span-2"><dt className={label}>Email</dt><dd className="truncate font-medium text-on-surface" title={customer.email}>{customer.email}</dd></div>
            </dl>
          </div>

          {/* Tổng quan chi tiêu */}
          <div className={section}>
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Tổng quan</h3>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded bg-surface-container-low p-3"><dt className={label}>Tổng chi tiêu</dt><dd className="mt-0.5 font-bold text-primary">{customer.totalSpendFormatted}</dd></div>
              <div className="rounded bg-surface-container-low p-3"><dt className={label}>Lượt lưu trú hoàn tất</dt><dd className="mt-0.5 font-bold text-on-surface">{customer.totalCompletedBookings}</dd></div>
            </dl>
          </div>

          {/* Yêu cầu từ các lần đặt */}
          {customer.serviceNotesTags.length > 0 && (
            <div className={section}>
              <h3 className="text-sm font-semibold text-on-surface">Ghi chú từ các lần đặt trước</h3>
              <p className="mb-3 mt-0.5 text-xs text-on-surface-variant">Tham khảo sở thích của khách; yêu cầu cho đơn sắp tới xem ở trang Đặt phòng.</p>
              <ul className="space-y-2">
                {customer.serviceNotesTags.map(note => (
                  <li key={note} className="flex gap-2 rounded bg-surface-container-low p-3 text-sm leading-6 text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-primary">sticky_note_2</span><span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lịch sử gần nhất */}
          <div className={section}>
            <h3 className="mb-3 text-sm font-semibold text-on-surface">Đặt phòng gần đây</h3>
            {customer.recentBookings.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có đặt phòng trong phạm vi bạn phụ trách.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded border border-outline-variant/40">
                {customer.recentBookings.map(b => (
                  <li key={b.bookingCode} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-on-surface">{b.bookingCode}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant'}`}>{BOOKING_STATUS_VI[b.status] ?? b.status}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-on-surface">{b.roomName}{b.roomNumber ? ` · ${b.roomNumber}` : ''}</p>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-on-surface-variant">
                      <span>{b.dates}{b.nightsText ? ` · ${b.nightsText}` : ''}</span>
                      <span className="font-semibold text-on-surface">{b.amount}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
