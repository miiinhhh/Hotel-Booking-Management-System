import React from 'react';
import { PaymentMethodType } from '../types';

interface PaymentMethodSectionProps {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  depositAmount: number;
  remainingAmount: number;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  selectedMethod,
  onSelectMethod,
  depositAmount,
  remainingAmount,
}) => {
  return (
    <section className="bg-surface-container-lowest rounded-lg p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex items-center justify-between pb-space-xs">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-headline-sm text-headline-sm flex items-center justify-center text-xs">
            3
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Phương thức thanh toán
          </h2>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
          Bảo mật 100%
        </div>
      </div>

      {/* Radio Options */}
      <div className="flex flex-col gap-space-sm" id="payment-options">
        {/* Option 1: Napas QR */}
        <label
          onClick={() => onSelectMethod('qr_napas')}
          className={`payment-card relative flex flex-col p-space-md rounded-lg cursor-pointer transition-all ${
            selectedMethod === 'qr_napas'
              ? 'bg-surface-container-low/70 shadow-sm border border-primary/20'
              : 'bg-surface-container-low/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="payment_method"
                value="qr_napas"
                checked={selectedMethod === 'qr_napas'}
                onChange={() => onSelectMethod('qr_napas')}
                className="mt-1 w-4 h-4 accent-primary text-primary focus:ring-0 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-sm text-on-surface font-semibold text-base">
                    Chuyển khoản VietQR / Napas 24/7 (Cọc 30%)
                  </span>
                  <span className="px-2.5 py-0.5 bg-primary text-on-primary font-label-sm text-label-sm rounded-full">
                    Phổ biến nhất
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Quét mã QR tự động từ mọi ứng dụng ngân hàng hoặc ví MoMo, ZaloPay. Xác nhận phòng tự động trong 30 giây.
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-primary text-[22px]">
                qr_code_scanner
              </span>
            </div>
          </div>

          {/* Deposit breakdown highlight inside card */}
          <div className="mt-space-sm bg-surface-container-lowest p-space-sm rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                verified
              </span>
              <span className="font-body-md text-body-md text-on-surface">
                Tiền cọc thanh toán ngay:
              </span>
            </div>
            <div className="text-right">
              <span className="font-headline-sm text-primary font-bold">
                {depositAmount.toLocaleString('vi-VN')}đ
              </span>
              <span className="block text-on-surface-variant font-label-sm text-label-sm">
                Còn lại {remainingAmount.toLocaleString('vi-VN')}đ thanh toán khi nhận phòng
              </span>
            </div>
          </div>
        </label>

        {/* Option 2: Pay at Hotel */}
        <label
          onClick={() => onSelectMethod('pay_at_hotel')}
          className={`payment-card relative flex flex-col p-space-md rounded-lg cursor-pointer transition-all ${
            selectedMethod === 'pay_at_hotel'
              ? 'bg-surface-container-low/70 shadow-sm border border-primary/20'
              : 'bg-surface-container-low/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="payment_method"
                value="pay_at_hotel"
                checked={selectedMethod === 'pay_at_hotel'}
                onChange={() => onSelectMethod('pay_at_hotel')}
                className="mt-1 w-4 h-4 accent-primary text-primary focus:ring-0 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-sm text-on-surface font-semibold text-base">
                    Thanh toán tại quầy lễ tân Resort
                  </span>
                  <span className="px-2.5 py-0.5 bg-surface-container text-on-surface font-label-sm text-label-sm rounded-full font-medium">
                    Không cần trả trước
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Thanh toán 100% bằng tiền mặt hoặc quẹt thẻ tín dụng tại quầy lễ tân khi làm thủ tục nhận phòng.
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">
                payments
              </span>
            </div>
          </div>
        </label>

        {/* Option 3: Credit Card International */}
        <label
          onClick={() => onSelectMethod('card_international')}
          className={`payment-card relative flex flex-col p-space-md rounded-lg cursor-pointer transition-all ${
            selectedMethod === 'card_international'
              ? 'bg-surface-container-low/70 shadow-sm border border-primary/20'
              : 'bg-surface-container-low/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="payment_method"
                value="card_international"
                checked={selectedMethod === 'card_international'}
                onChange={() => onSelectMethod('card_international')}
                className="mt-1 w-4 h-4 accent-primary text-primary focus:ring-0 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline-sm text-on-surface font-semibold text-base">
                    Thẻ tín dụng / Ghi nợ Quốc tế
                  </span>
                  <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm rounded-full">
                    0% phí giao dịch
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Hỗ trợ Visa, Mastercard, JCB, American Express với cổng thanh toán toàn cầu 3D-Secure.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm font-bold text-on-surface tracking-wide shadow-xs">
                    VISA
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm font-bold text-on-surface tracking-wide shadow-xs">
                    Mastercard
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm font-bold text-on-surface tracking-wide shadow-xs">
                    JCB
                  </span>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[22px]">
                credit_card
              </span>
            </div>
          </div>
        </label>
      </div>
    </section>
  );
};
