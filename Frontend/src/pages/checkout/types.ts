export type PaymentMethodType = 'qr_napas' | 'pay_at_hotel' | 'card_international';

export interface CheckoutContactInfo {
  fullName: string;
  phone: string;
  email: string;
  isBookingForOther: boolean;
  otherGuestName?: string;
}

export interface SpecialRequestOption {
  id: string;
  label: string;
  selected: boolean;
}

export interface CheckoutBookingData {
  roomId?: number;
  hotelId?: number;
  checkIn?: string;
  checkOut?: string;
  numberOfGuests?: number;
  hotelName: string;
  starRatingText: string;
  location: string;
  hotelImage: string;
  roomName: string;
  roomAmenities: string[];
  checkInDateText: string;
  checkInTimeText: string;
  checkOutDateText: string;
  checkOutTimeText: string;
  nightsCount: number;
  guestsText: string;
  originalPrice: number;
  memberDiscount: number;
  couponCode: string;
  couponDiscount: number;
  depositPercentage: number;
  depositAmount: number;
  remainingAmount: number;
  totalPrice: number;
}
