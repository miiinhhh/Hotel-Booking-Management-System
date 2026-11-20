import { discoveryRequest } from './discoveryApi';

export interface PublicVoucher {
  code: string;
  voucherType: 'Percentage' | 'FixedAmount';
  discountValue: number;
  maxDiscountAmount: number | null;
  minimumOrderAmount: number;
  startAt: string;
  endAt: string;
  usageLimitPerCustomer: number;
  /** % lượt đã dùng (null = không giới hạn lượt). */
  usedPercent: number | null;
  /** Số lần bạn còn dùng được (null khi chưa đăng nhập). */
  remainingForMe: number | null;
}
export interface MyVoucherUsage { code: string; bookingCode: string; discountApplied: number; usedAt: string }

export const PENDING_VOUCHER_KEY = 'stayluxe.pendingVoucher';

export const offerApi = {
  available: () => discoveryRequest<PublicVoucher[]>('/api/vouchers/available'),
  myUsages: () => discoveryRequest<MyVoucherUsage[]>('/api/vouchers/my-usages'),
  /** Lưu mã để trang Thanh toán tự áp dụng khi khách đặt phòng tiếp theo. */
  rememberForCheckout: (code: string) => { try { sessionStorage.setItem(PENDING_VOUCHER_KEY, code); } catch { /* bỏ qua */ } },
  /** Lấy (và xóa) mã đang chờ áp dụng. */
  takePending: (): string => {
    try { const code = sessionStorage.getItem(PENDING_VOUCHER_KEY) || ''; sessionStorage.removeItem(PENDING_VOUCHER_KEY); return code; }
    catch { return ''; }
  },
};
