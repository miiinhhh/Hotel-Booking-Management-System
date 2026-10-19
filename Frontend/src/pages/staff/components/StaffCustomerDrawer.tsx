import React, { useState } from 'react';
import { StaffCustomer } from '../types';

interface StaffCustomerDrawerProps {
  customer: StaffCustomer | null;
  onClose?: () => void;
  onAddPreferenceNote?: (noteText: string) => void;
  onEditCustomer?: (customer: StaffCustomer) => void;
  onOpenZaloChat?: (phone: string) => void;
  onViewAllBookings?: (customerId: string) => void;
}

export const StaffCustomerDrawer: React.FC<StaffCustomerDrawerProps> = ({
  customer,
  onClose,
  onAddPreferenceNote,
  onEditCustomer,
  onOpenZaloChat,
  onViewAllBookings,
}) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteInput, setNewNoteInput] = useState('');

  if (!customer) {
    return (
      <aside className="lg:col-span-5 xl:col-span-5 bg-surface-container-lowest rounded-lg p-8 shadow-md flex flex-col items-center justify-center text-center text-on-surface-variant min-h-[400px]">
        <span className="material-symbols-outlined text-[48px] text-outline mb-2">person_search</span>
        <p className="font-label-lg font-semibold text-on-surface">Chưa chọn khách hàng</p>
        <p className="font-body-md text-sm mt-1">
          Nhấp vào một khách hàng trong danh sách bên trái để xem hồ sơ và lịch sử chi tiết.
        </p>
      </aside>
    );
  }

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteInput.trim()) return;
    onAddPreferenceNote?.(newNoteInput.trim());
    setNewNoteInput('');
    setIsAddingNote(false);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-900 px-3 py-1 rounded-full font-label-sm text-label-sm font-bold border border-slate-300">
            <span className="material-symbols-outlined text-[16px] text-slate-700">diamond</span>
            💎 VIP Platinum Member
          </span>
        );
      case 'GOLD':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 px-3 py-1 rounded-full font-label-sm text-label-sm font-bold border border-amber-200">
            <span className="material-symbols-outlined text-[16px] text-amber-600">stars</span>
            ★ VIP Gold Member
          </span>
        );
      case 'SILVER':
        return (
          <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-800 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold border border-stone-200">
            <span className="material-symbols-outlined text-[16px] text-stone-600">military_tech</span>
            Silver Member
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold text-on-surface">
            Standard Member
          </span>
        );
    }
  };

  return (
    <aside className="lg:col-span-5 xl:col-span-5 bg-surface-container-lowest rounded-lg p-6 shadow-md flex flex-col gap-6 sticky top-28 border border-[#eae8e5]">
      {/* Drawer Top Bar & Profile Identity Card */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          {getTierBadge(customer.tier)}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              title="Đóng ngăn chi tiết"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-headline-md text-headline-md font-bold shadow-md shrink-0">
            {customer.initials}
            {customer.isStaying && (
              <span
                className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-600 ring-2 ring-surface-container-lowest animate-pulse"
                title="Đang lưu trú tại resort"
              />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight truncate">
                {customer.name}
              </h2>
              <span
                className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0"
                title="Đã xác thực CCCD điện tử VNeID"
              >
                verified
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant truncate">
              Mã khách: <strong className="text-on-surface font-mono">{customer.customerCode}</strong> • Khách quen từ {customer.memberSinceYear}
            </span>
            {customer.isStaying && customer.currentRoom && (
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-label-sm font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Đang lưu trú: {customer.currentRoom}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Pill Bar */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href={`tel:${customer.phone.replace(/\s+/g, '')}`}
            className="flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface py-2 rounded-full font-label-sm text-label-sm font-semibold transition-all border border-[#eae8e5]"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">phone</span>
            <span>Gọi ngay</span>
          </a>
          <button
            type="button"
            onClick={() => onOpenZaloChat?.(customer.phone)}
            className="flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface py-2 rounded-full font-label-sm text-label-sm font-semibold transition-all border border-[#eae8e5] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">chat</span>
            <span>SMS / Zalo</span>
          </button>
          <button
            type="button"
            onClick={() => onEditCustomer?.(customer)}
            className="flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface py-2 rounded-full font-label-sm text-label-sm font-semibold transition-all border border-[#eae8e5] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">edit</span>
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>

      {/* Card 1: Thông tin định danh & Liên lạc */}
      <div className="bg-surface-container-low p-4 rounded-DEFAULT flex flex-col gap-3 border border-[#eae8e5]">
        <div className="flex items-center justify-between pb-1">
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-primary">badge</span>
            Thông tin định danh &amp; Liên lạc
          </span>
          {customer.nfcChipOk && (
            <span className="text-emerald-700 font-label-sm text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              NFC Chip Ok
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-body-md font-body-md">
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Số điện thoại</span>
            <span className="font-semibold text-on-surface text-[13px]">{customer.phone}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Email cá nhân</span>
            <span className="font-semibold text-on-surface text-[13px] truncate" title={customer.email}>
              {customer.email}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Giấy tờ tùy thân</span>
            <span className="font-semibold text-on-surface text-[13px] font-mono">{customer.identityCard}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Ngày sinh &amp; Quốc tịch</span>
            <span className="font-semibold text-on-surface text-[13px]">
              {customer.birthDate} • {customer.country}
            </span>
          </div>
          {customer.company && (
            <div className="col-span-2 flex flex-col pt-1">
              <span className="font-label-sm text-[11px] text-on-surface-variant">Công ty / Tổ chức công tác</span>
              <span className="font-semibold text-on-surface text-[13px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-secondary">corporate_fare</span>
                {customer.company}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Thói quen & Ghi chú phục vụ (Guest Preferences & Care Notes) */}
      <div className="bg-surface-container-low p-4 rounded-DEFAULT flex flex-col gap-3 border border-[#eae8e5]">
        <div className="flex items-center justify-between pb-1">
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-primary">room_service</span>
            Thói quen &amp; Ghi chú Phục vụ
          </span>
          <span className="font-label-sm text-[11px] text-primary font-semibold">Ưu tiên cao</span>
        </div>
        <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
          Thông tin đồng bộ nội bộ giữa Lễ tân, Buồng phòng (HK) và Bếp/F&amp;B cho toàn bộ kỳ nghỉ.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          {customer.preferences.map((pref, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-2 rounded-DEFAULT text-[12px] ${
                pref.isWarning
                  ? 'bg-amber-50/90 text-amber-950 font-semibold border border-amber-200'
                  : 'bg-surface-container-lowest text-on-surface shadow-xs'
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] shrink-0 ${pref.colorClass || 'text-primary'}`}>
                {pref.icon}
              </span>
              <span>{pref.text}</span>
            </div>
          ))}
        </div>

        {isAddingNote ? (
          <form onSubmit={handleSaveNote} className="mt-2 flex flex-col gap-2">
            <textarea
              className="w-full bg-surface-container-lowest rounded-DEFAULT p-2.5 font-body-md text-xs text-on-surface border border-primary outline-none"
              placeholder="Nhập ghi chú phục vụ mới (ví dụ: chuộng tầng cao, ăn chay, có thú cưng)..."
              rows={2}
              value={newNoteInput}
              onChange={(e) => setNewNoteInput(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteInput('');
                }}
                className="px-3 py-1 rounded-full text-xs text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-full bg-primary-container text-on-primary text-xs font-semibold cursor-pointer shadow-sm hover:bg-primary"
              >
                Lưu ghi chú
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingNote(true)}
            className="mt-2 w-full py-2 px-3 rounded-DEFAULT bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>+ Thêm ghi chú phục vụ đặc biệt</span>
          </button>
        )}
      </div>

      {/* Card 3: Lịch sử đặt phòng gần nhất */}
      <div className="bg-surface-container-low p-4 rounded-DEFAULT flex flex-col gap-3 border border-[#eae8e5]">
        <div className="flex items-center justify-between pb-1">
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-primary">history</span>
            Lịch sử Đặt phòng ({customer.totalCompletedBookings} kỳ nghỉ)
          </span>
          <span className="font-label-sm text-[11px] text-primary font-bold">{customer.totalSpendFormatted}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {customer.recentBookings.map((b, i) => (
            <div
              key={i}
              className={`p-3 rounded-DEFAULT flex flex-col gap-1.5 ${
                b.isActive
                  ? 'bg-surface-container-lowest shadow-sm border border-emerald-300'
                  : 'bg-surface-container-lowest shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] font-bold text-on-surface">{b.bookingCode}</span>
                <span
                  className={`text-[10px] font-label-sm font-bold px-2 py-0.5 rounded-full ${
                    b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <div className="font-label-md text-label-md font-semibold text-on-surface">{b.roomName}</div>
              <div className="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant">
                <span>{b.dates}</span>
                <span className="text-primary font-bold text-[12px]">{b.amount}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onViewAllBookings?.(customer.id)}
          className="w-full text-center text-primary hover:text-secondary font-label-md text-label-md font-semibold pt-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Xem toàn bộ {customer.totalCompletedBookings} lịch sử đặt phòng</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </aside>
  );
};
