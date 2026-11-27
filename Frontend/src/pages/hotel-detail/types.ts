export interface RoomPackage {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  badge?: string;
  isRecommended?: boolean;
}

export interface RoomSpec {
  icon: string;
  text: string;
}

export interface RoomFeature {
  icon: string;
  text: string;
}

export interface Room {
  roomId?: number;
  hotelId?: number;
  hotelName?: string;
  hotelAddress?: string;
  requestedGuests?: number;
  checkIn?: string;
  checkOut?: string;
  id: string;
  name: string;
  tag: string;
  floor: string;
  remainingRooms: number;
  /** Khách đặt theo HẠNG phòng: số phòng cụ thể do hệ thống xếp tạm, lễ tân xếp lại khi nhận phòng. */
  roomTypeId?: number;
  typeName?: string;
  /** Số phòng khách chọn cho hạng này (mặc định 1). */
  quantity?: number;
  /** Các phòng trống cụ thể đã chọn (sau khi xác nhận ngày), gửi khi đặt. */
  roomIds?: number[];
  remainingBadgeColor?: 'error' | 'secondary' | 'neutral';
  image: string;
  imageAlt?: string;
  specs: RoomSpec[];
  features: RoomFeature[];
  packages?: RoomPackage[];
  allInclusiveDetail?: {
    title: string;
    description: string;
    pricePerNight: number;
  };
  cancellationPolicy: string;
  urgencyNote?: string;
}

export interface ResortAmenity {
  icon: string;
  title: string;
  subtitle: string;
}

export interface HotelDetail {
  checkIn?: string;
  checkOut?: string;
  guestsPerRoom?: number;
  id: string;
  name: string;
  categoryTag: string;
  starRating: number;
  address: string;
  distanceToBeach: string;
  ratingScore: number;
  ratingText: string;
  reviewCount: number;
  galleryImages: {
    hero: {
      url: string;
      caption: string;
      badge: string;
    };
    thumbnails: {
      url: string;
      caption: string;
    }[];
    totalCount: number;
  };
  checkInTime: string;
  checkOutTime: string;
  cancelPolicySummary: string;
  datesText: string;
  durationNights: number;
  guestsText: string;
  resortAmenities: ResortAmenity[];
  rooms: Room[];
}
