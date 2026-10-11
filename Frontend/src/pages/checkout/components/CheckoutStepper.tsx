import React from 'react';

interface CheckoutStepperProps {
  onBackToHotel?: () => void;
}

export const CheckoutStepper: React.FC<CheckoutStepperProps> = ({ onBackToHotel }) => {
  return (
    <div className="flex flex-col gap-space-xs">
      {/* Stepper Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 text-on-surface-variant font-label-md text-label-md">
        <button
          onClick={onBackToHotel}
          className="flex items-center gap-1 text-primary font-semibold hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          1. Chọn phòng
        </button>
        <span className="material-symbols-outlined text-[14px] text-surface-dim">
          chevron_right
        </span>
        <span className="flex items-center gap-1 text-primary font-semibold">
          <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
            2
          </span>
          2. Thông tin &amp; Thanh toán
        </span>
        <span className="material-symbols-outlined text-[14px] text-surface-dim">
          chevron_right
        </span>
        <span className="text-on-surface-variant/60 flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] flex items-center justify-center font-bold">
            3
          </span>
          3. Xác nhận
        </span>
      </div>

      {/* Main Headline */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-xs mt-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Xác nhận thông tin &amp; Thanh toán
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Vui lòng rà soát chi tiết đặt phòng và lựa chọn phương thức giao dịch bảo mật chuẩn quốc tế.
          </p>
        </div>
        <div className="flex items-center gap-2 text-primary font-label-sm text-label-sm bg-surface-container-low px-3 py-1.5 rounded-full shrink-0 self-start md:self-auto">
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
          Mã hóa 256-bit SSL Khép kín
        </div>
      </div>
    </div>
  );
};
