import React from 'react';

export const AssuranceBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-primary-fixed/30 rounded-lg p-space-md flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start md:items-center gap-space-sm">
        <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5 md:mt-0">
          <span className="material-symbols-outlined text-[20px]">verified_user</span>
        </div>
        <div>
          <span className="font-label-lg text-label-lg text-on-primary-fixed font-bold block">
            Bảo lãnh hoàn tiền StayLuxe 24H
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Hủy miễn phí trước giờ quy định hoàn tiền 100% tự động. Thủ tục xử lý minh bạch qua hệ thống ngân hàng nội địa và quốc tế.
          </p>
        </div>
      </div>
      <a
        className="inline-flex items-center gap-1 font-label-md text-label-md text-primary font-bold hover:underline shrink-0"
        href="#chinh-sach-hoan-tien"
        onClick={(e) => e.preventDefault()}
      >
        <span>Chi tiết điều khoản hoàn tiền</span>
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </a>
    </div>
  );
};
