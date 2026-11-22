export interface HotelAmenity {
  icon: string;
  text: string;
  isHighlight?: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  image: string;
  imageAlt?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'neutral';
  location: string;
  distanceInfo?: string;
  starRating: number;
  amenities: HotelAmenity[];
  featuredRoomType: string;
  ratingScore: number;
  ratingText: string;
  reviewCount: number;
  originalPrice?: number;
  pricePerNight: number;
  isFavorite?: boolean;
  /** Số phòng còn trống (hiển thị được dịch ở giao diện). */
  availableRooms?: number;
}

export type SortOption =
  | 'popularity'
  | 'rating'
  | 'price_asc'
  | 'price_desc'
  | 'best_deal';
