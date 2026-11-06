/**
 * Shared Formatting Utilities for StayLuxe Hotel Booking System
 */

/**
 * Định dạng số tiền sang chuẩn tiền tệ Việt Nam (VNĐ).
 * Ví dụ:
 *  1500000 -> "1.500.000 ₫"
 *  0 -> "0 ₫"
 *  null / undefined / NaN -> "0 ₫"
 */
export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

/**
 * Định dạng ngày theo chuẩn hiển thị tiếng Việt (DD/MM/YYYY).
 */
export function formatDateVi(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2 }).format(d.getDate()) +
      '/' +
      new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2 }).format(d.getMonth() + 1) +
      '/' +
      d.getFullYear();
  } catch {
    return String(dateStr);
  }
}
