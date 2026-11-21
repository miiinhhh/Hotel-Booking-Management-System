import React from 'react';

/** Giải thích đúng quy trình hoàn tiền hiện có: theo chính sách hủy, nhân viên xử lý thủ công. */
export const AssuranceBanner: React.FC = () => (
  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 md:flex-row md:items-center">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-primary">
        <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
      </span>
      <div>
        <p className="font-semibold text-on-surface">Hoàn tiền khi hủy đặt phòng</p>
        <p className="mt-0.5 text-sm text-on-surface-variant">
          Số tiền hoàn tính theo chính sách hủy của khách sạn và thời điểm bạn hủy. Sau khi hủy, đơn chuyển sang “Chờ hoàn tiền”
          và nhân viên sẽ hoàn qua VNPay hoặc liên hệ hoàn trực tiếp.
        </p>
      </div>
    </div>
    <a href="#dieu-khoan" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
      Điều khoản hủy & hoàn tiền<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </a>
  </div>
);
export default AssuranceBanner;
