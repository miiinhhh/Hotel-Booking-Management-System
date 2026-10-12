import React from 'react';
import { CheckoutContactInfo } from '../types';

interface ContactInfoSectionProps {
  contactInfo: CheckoutContactInfo;
  onChange: (info: CheckoutContactInfo) => void;
}

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({
  contactInfo,
  onChange,
}) => {
  return (
    <section className="bg-surface-container-lowest rounded-lg p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center justify-between pb-space-xs">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-headline-sm text-headline-sm flex items-center justify-center text-xs">
            1
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Thông tin người liên hệ
          </h2>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full">
          Bắt buộc
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            Họ và tên quý khách
          </label>
          <div className="relative">
            <input
              type="text"
              value={contactInfo.fullName}
              onChange={(e) =>
                onChange({ ...contactInfo, fullName: e.target.value })
              }
              placeholder="Nhập họ và tên..."
              className="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-full font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all pl-11"
            />
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              person
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
            Số điện thoại liên lạc
          </label>
          <div className="relative">
            <input
              type="tel"
              value={contactInfo.phone}
              onChange={(e) =>
                onChange({ ...contactInfo, phone: e.target.value })
              }
              placeholder="+84 ..."
              className="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-full font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all pl-11"
            />
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              call
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Địa chỉ Email xác nhận
        </label>
        <div className="relative">
          <input
            type="email"
            value={contactInfo.email}
            onChange={(e) =>
              onChange({ ...contactInfo, email: e.target.value })
            }
            placeholder="name@domain.com"
            className="w-full bg-surface-container-low text-on-surface px-4 py-3 rounded-full font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all pl-11"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            mail
          </span>
        </div>
        <p className="font-body-md text-label-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
          <span className="material-symbols-outlined text-[15px] text-primary">info</span>
          Xác nhận phòng tức thì cùng vé mời điện tử VIP sẽ được gửi về hộp thư này.
        </p>
      </div>

      <div className="pt-space-xs">
        <label className="flex items-start gap-space-sm cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={contactInfo.isBookingForOther}
            onChange={(e) =>
              onChange({ ...contactInfo, isBookingForOther: e.target.checked })
            }
            className="mt-1 w-4 h-4 rounded text-primary accent-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="font-body-md text-body-md text-on-surface font-medium group-hover:text-primary transition-colors">
              Tôi đặt phòng cho người thân hoặc đối tác
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Thông tin tên người lưu trú thực tế có thể cập nhật trong email xác nhận sau khi hoàn tất.
            </span>
          </div>
        </label>

        {contactInfo.isBookingForOther && (
          <div className="mt-3 pl-7">
            <input
              type="text"
              value={contactInfo.otherGuestName || ''}
              onChange={(e) =>
                onChange({ ...contactInfo, otherGuestName: e.target.value })
              }
              placeholder="Tên người đại diện nhận phòng thực tế..."
              className="w-full bg-surface-container-low text-on-surface px-4 py-2.5 rounded-full font-body-md text-sm focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        )}
      </div>
    </section>
  );
};
