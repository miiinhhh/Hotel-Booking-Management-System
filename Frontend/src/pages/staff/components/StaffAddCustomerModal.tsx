import React, { useState } from 'react';
import { CustomerTier, StaffCustomer } from '../types';

interface StaffAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (newCustomer: StaffCustomer) => void;
}

export const StaffAddCustomerModal: React.FC<StaffAddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer,
}) => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<CustomerTier>('GOLD');
  const [country, setCountry] = useState('Việt Nam');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [company, setCompany] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Vui lòng điền Họ tên và Số điện thoại khách hàng.');
      return;
    }

    const parts = name.trim().split(' ');
    const initials =
      parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();

    const randomId = Math.floor(10000 + Math.random() * 90000);
    const notesArray = serviceNotes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newCust: StaffCustomer = {
      id: initials + randomId.toString().slice(-2),
      customerCode: `#CUST-${randomId}`,
      name: name.trim(),
      initials,
      tier,
      country: country.trim() || 'Việt Nam',
      phone: phone.trim(),
      email: email.trim() || 'guest@luxgroup.vn',
      identityCard: identityCard.trim() || '001199' + randomId,
      birthDate: '01/01/1990',
      company: company.trim() || undefined,
      isStaying: false,
      lastStayInfo: 'Khách mới khởi tạo',
      totalSpend: 0,
      totalSpendFormatted: '0₫',
      totalCompletedBookings: 0,
      serviceNotesTags: notesArray.length ? notesArray : ['Khách mới', 'Chưa có ghi chú'],
      preferences: notesArray.map((note) => ({
        icon: 'room_service',
        text: note,
        colorClass: 'text-primary',
      })),
      recentBookings: [],
      memberSinceYear: new Date().getFullYear().toString(),
      nfcChipOk: true,
    };

    onAddCustomer(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-md">
      <div className="bg-surface-container-lowest rounded-lg max-w-lg w-full shadow-2xl overflow-hidden border border-[#eae8e5]">
        {/* Header */}
        <div className="p-5 bg-surface-container-low flex items-center justify-between border-b border-[#eae8e5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Thêm Hồ Sơ Khách Hàng Mới</h3>
              <p className="font-label-sm text-xs text-on-surface-variant">Lưu thông tin định danh và sở thích CRM</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Họ và Tên khách <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn An"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Hạng thành viên
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as CustomerTier)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary cursor-pointer"
              >
                <option value="GOLD">★ Gold Member</option>
                <option value="PLATINUM">💎 Platinum Member</option>
                <option value="SILVER">Silver Member</option>
                <option value="STANDARD">Standard Member</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Quốc tịch
              </label>
              <input
                type="text"
                placeholder="VD: Việt Nam"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Số điện thoại <span className="text-error">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Email
              </label>
              <input
                type="email"
                placeholder="an.nguyen@company.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                CCCD / Hộ chiếu
              </label>
              <input
                type="text"
                placeholder="001198004128"
                value={identityCard}
                onChange={(e) => setIdentityCard(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Công ty / Đơn vị
              </label>
              <input
                type="text"
                placeholder="Công ty TNHH..."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="font-label-sm text-xs uppercase font-semibold text-on-surface-variant">
                Ghi chú phục vụ ban đầu (cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                placeholder="VD: Không hút thuốc, Dị ứng hải sản, Thích view biển"
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                className="bg-surface-container-low rounded-DEFAULT px-3 py-2 text-sm text-on-surface outline-none border border-[#eae8e5] focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eae8e5]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full font-label-md text-sm text-on-surface hover:bg-surface-container cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-sm font-semibold hover:bg-primary shadow-sm cursor-pointer"
            >
              Lưu hồ sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
