// Mã quyền phải trùng khớp với HotelBooking.Domain SystemPermissions ở Backend.
export const PERMISSIONS = {
  hotelManage: 'hotels.manage',
  areaManage: 'areas.manage',
  roomManage: 'rooms.manage',
  inventoryView: 'inventory.view',
  inventoryManage: 'inventory.manage',
  bookingView: 'bookings.view',
  bookingManage: 'bookings.manage',
  paymentView: 'payments.view',
  paymentManage: 'payments.manage',
  pricingView: 'pricing.view',
  pricingManage: 'pricing.manage',
  voucherView: 'vouchers.view',
  voucherManage: 'vouchers.manage',
  staffView: 'staff.view',
  staffManage: 'staff.manage',
  accountsManage: 'accounts.manage',
  rolesManage: 'roles.manage',
  reviewsManage: 'reviews.manage',
  contentManage: 'content.manage',
  policiesManage: 'policies.manage',
  reportsView: 'reports.view',
} as const;

export const FORBIDDEN_MESSAGE = 'Bạn không có quyền thực hiện thao tác này.';
const FORBIDDEN_EVENT = 'stayluxe:forbidden';

/** Gọi từ mọi wrapper fetch khi Backend trả 403 để AuthContext đồng bộ lại quyền. */
export function notifyForbidden() {
  window.dispatchEvent(new Event(FORBIDDEN_EVENT));
}

/**
 * 401 (token cũ bị vô hiệu vì Admin vừa đổi role/quyền) hoặc 403 đều là tín hiệu cần đồng bộ lại quyền.
 * Không dùng cho các API đăng nhập/làm mới phiên để tránh vòng lặp.
 */
export function notifyAuthFailure(status: number) {
  if (status === 401 || status === 403) notifyForbidden();
}

export function onForbidden(handler: () => void) {
  window.addEventListener(FORBIDDEN_EVENT, handler);
  return () => window.removeEventListener(FORBIDDEN_EVENT, handler);
}

/** Quyền tự phục vụ của khách hàng (khớp SystemPermissions.DefaultCustomer). */
export const SELF_PERMISSIONS = {
  bookingCreate: 'bookings.self.create',
  bookingView: 'bookings.self.view',
  bookingCancel: 'bookings.self.cancel',
  paymentManage: 'payments.self.manage',
  reviewManage: 'reviews.self.manage',
  wishlistManage: 'wishlist.self.manage',
} as const;
