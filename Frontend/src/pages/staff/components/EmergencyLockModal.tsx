import React, { useState } from 'react';
import { EmergencyLockFormData } from '../types';

interface EmergencyLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLock: (data: EmergencyLockFormData) => void;
  initialCategory?: string;
  initialRoomNumber?: string;
}

export const EmergencyLockModal: React.FC<EmergencyLockModalProps> = ({
  isOpen,
  onClose,
  onConfirmLock,
  initialCategory = 'Tòa A · Premier Ocean Suite',
  initialRoomNumber = 'P.305',
}) => {
  const [category, setCategory] = useState(initialCategory);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([initialRoomNumber]);
  const [newRoomInput, setNewRoomInput] = useState('');
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [startDate, setStartDate] = useState('24/10/2025 (Hôm nay)');
  const [endDate, setEndDate] = useState('27/10/2025 (14:00)');
  const [lockReason, setLockReason] = useState<'maintenance' | 'emergency' | 'vip_hold' | 'other'>('maintenance');
  const [internalNotes, setInternalNotes] = useState(
    'P.305 bảo trì hệ thống điều hòa và thay kính ban công, dự kiến hoàn tất trước 14:00 ngày 27/10. Đội kỹ thuật: Anh Tuấn (Ext 142).'
  );

  if (!isOpen) return null;

  const handleRemoveRoom = (roomToRemove: string) => {
    setSelectedRooms((prev) => prev.filter((r) => r !== roomToRemove));
  };

  const handleAddRoom = () => {
    if (newRoomInput.trim() && !selectedRooms.includes(newRoomInput.trim())) {
      setSelectedRooms([...selectedRooms, newRoomInput.trim()]);
      setNewRoomInput('');
      setIsAddingRoom(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRooms.length === 0) {
      alert('Vui lòng chọn ít nhất 1 số phòng để khóa bán.');
      return;
    }

    onConfirmLock({
      buildingAndCategory: category,
      roomNumbers: selectedRooms,
      startDate,
      endDate,
      reason: lockReason,
      internalNotes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-inverse-surface/40 backdrop-blur-md">
      <div className="bg-surface-container-lowest rounded-lg max-w-2xl w-full shadow-[0_24px_60px_-12px_rgba(39,34,30,0.22)] overflow-hidden flex flex-col max-h-[92vh] border border-[#eae8e5]">
        {/* Modal Header */}
        <div className="p-6 bg-surface-container-low flex items-start justify-between gap-4 border-b border-[#eae8e5]">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">shield_lock</span>
            </div>
            <div className="flex flex-col">
              <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
                Khóa phòng khẩn cấp / Đóng bán (Emergency Room Lock)
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Thao tác sẽ lập tức gỡ phòng khỏi kênh OTA và hệ thống đặt trực tiếp của khách hàng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Field 1: Building & Room Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
                Phân khu &amp; Hạng phòng
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container-low rounded-DEFAULT px-4 py-2.5 font-body-md text-body-md text-on-surface appearance-none outline-none border border-[#eae8e5] focus:bg-surface-container-lowest focus:border-primary transition-all cursor-pointer"
                >
                  <option>Tòa A · Premier Ocean Suite</option>
                  <option>Tòa A · Beachfront Pool Villa</option>
                  <option>Tòa A · Presidential Sea Suite</option>
                  <option>Tòa B · Deluxe Garden View</option>
                  <option>Tòa B · Deluxe Ocean View</option>
                </select>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant absolute right-3 top-3 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
                Số lượng phòng cần đóng
              </label>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-DEFAULT bg-surface-container-low border border-[#eae8e5]">
                <span className="font-body-md text-body-md text-on-surface font-semibold">
                  {selectedRooms.length.toString().padStart(2, '0')} phòng được chọn
                </span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-bold">
                  Auto Sync
                </span>
              </div>
            </div>
          </div>

          {/* Field 2: Room Number Tags Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
              Danh sách số phòng cụ thể
            </label>
            <div className="p-3 rounded-DEFAULT bg-surface-container-low flex flex-wrap items-center gap-2 border border-[#eae8e5]">
              {selectedRooms.map((rm) => (
                <span
                  key={rm}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">meeting_room</span>
                  <span>{rm.startsWith('P.') ? rm : `P.${rm}`}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(rm)}
                    className="hover:opacity-75 transition-opacity cursor-pointer flex items-center"
                    title="Xóa phòng"
                  >
                    <span className="material-symbols-outlined text-[15px]">cancel</span>
                  </button>
                </span>
              ))}

              {isAddingRoom ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="VD: 306"
                    value={newRoomInput}
                    onChange={(e) => setNewRoomInput(e.target.value)}
                    className="w-20 px-2 py-1 rounded-full text-xs bg-surface-container-lowest border border-primary outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddRoom}
                    className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-semibold cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingRoom(false)}
                    className="px-2 py-1 rounded-full text-xs text-on-surface-variant cursor-pointer hover:bg-surface-container"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Chọn thêm phòng...</span>
                </button>
              )}
            </div>
          </div>

          {/* Field 3: Date Range Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
                Từ ngày (Bắt đầu khóa)
              </label>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-DEFAULT bg-surface-container-low border border-[#eae8e5]">
                <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
                <input
                  className="bg-transparent w-full text-on-surface font-body-md text-body-md outline-none"
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
                Đến ngày (Dự kiến mở bán lại)
              </label>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-DEFAULT bg-surface-container-low border border-[#eae8e5]">
                <span className="material-symbols-outlined text-[18px] text-secondary">event_repeat</span>
                <input
                  className="bg-transparent w-full text-on-surface font-body-md text-body-md outline-none"
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Field 4: Lock Reason Radio Selection */}
          <div className="flex flex-col gap-2">
            <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
              Lý do khóa bán khẩn cấp
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-3 p-3 rounded-DEFAULT bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors border border-[#eae8e5]">
                <input
                  type="radio"
                  name="lock_reason"
                  checked={lockReason === 'maintenance'}
                  onChange={() => setLockReason('maintenance')}
                  className="w-4 h-4 text-primary-container focus:ring-0 accent-primary-container"
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Bảo trì / Kỹ thuật
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Sửa điều hòa, sơn tường, thấm dột
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-DEFAULT bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors border border-[#eae8e5]">
                <input
                  type="radio"
                  name="lock_reason"
                  checked={lockReason === 'emergency'}
                  onChange={() => setLockReason('emergency')}
                  className="w-4 h-4 text-primary-container focus:ring-0 accent-primary-container"
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Sự cố khẩn cấp
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Điện, nước, khóa từ không nhận
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-DEFAULT bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors border border-[#eae8e5]">
                <input
                  type="radio"
                  name="lock_reason"
                  checked={lockReason === 'vip_hold'}
                  onChange={() => setLockReason('vip_hold')}
                  className="w-4 h-4 text-primary-container focus:ring-0 accent-primary-container"
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    VIP giữ chỗ nội bộ
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Giữ phòng theo lệnh Ban Giám đốc
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-DEFAULT bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors border border-[#eae8e5]">
                <input
                  type="radio"
                  name="lock_reason"
                  checked={lockReason === 'other'}
                  onChange={() => setLockReason('other')}
                  className="w-4 h-4 text-primary-container focus:ring-0 accent-primary-container"
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Khác</span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Ghi chú cụ thể bên dưới
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Field 5: Detailed Internal Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">
              Ghi chú chi tiết cho bộ phận Buồng phòng &amp; Lễ tân
            </label>
            <textarea
              className="w-full bg-surface-container-low rounded-DEFAULT p-3.5 font-body-md text-body-md text-on-surface outline-none border border-[#eae8e5] focus:bg-surface-container-lowest focus:border-primary transition-all placeholder:text-outline"
              placeholder="Nhập chi tiết công việc bảo trì, người phụ trách, số liên hệ..."
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>

          {/* Warning Callout Banner */}
          <div className="p-4 rounded-DEFAULT bg-secondary-fixed/50 flex items-start gap-3 border border-secondary/20">
            <span className="material-symbols-outlined text-[20px] text-secondary shrink-0 mt-0.5">warning</span>
            <div className="flex flex-col text-on-secondary-fixed-variant">
              <span className="font-label-md text-label-md font-bold">Cảnh báo tác động buồng phòng:</span>
              <span className="font-body-md text-[13px] leading-relaxed">
                Đang có 01 yêu cầu giữ chỗ chưa duyệt vào ngày 26/10. Sau khi xác nhận, hệ thống sẽ tự động gỡ
                phòng khỏi Agoda/Booking.com và gửi thông báo khẩn đến Quản lý ca trực.
              </span>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full font-label-lg text-label-lg text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-[0_8px_20px_-4px_rgba(194,65,12,0.35)] hover:bg-primary transition-all duration-200 cursor-pointer font-semibold"
            >
              <span className="material-symbols-outlined text-[19px]">lock</span>
              <span>Xác nhận khóa bán phòng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
