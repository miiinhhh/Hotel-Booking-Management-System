import { CheckoutBookingData } from '../types';

/** Đơn trống: dùng khi chưa chọn phòng. Không chứa dữ liệu mẫu để tránh hiển thị thông tin giả. */
export const DEFAULT_CHECKOUT_DATA: CheckoutBookingData = {
  hotelName: '',
  starRatingText: '',
  location: '',
  hotelImage: '',
  roomName: '',
  roomAmenities: [],
  checkInDateText: '',
  checkInTimeText: '',
  checkOutDateText: '',
  checkOutTimeText: '',
  nightsCount: 0,
  guestsText: '',
  originalPrice: 0,
  memberDiscount: 0,
  couponCode: '',
  couponDiscount: 0,
  depositPercentage: 0,
  depositAmount: 0,
  remainingAmount: 0,
  totalPrice: 0,
};
