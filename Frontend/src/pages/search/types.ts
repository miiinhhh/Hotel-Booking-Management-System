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
}

export type SortOption =
  | 'popularity'
  | 'rating'
  | 'price_asc'
  | 'price_desc'
  | 'best_deal';

export interface PropertyTypeFilter {
  id: string;
  label: string;
  count: number;
}

export interface GuestRatingFilter {
  id: string;
  label: string;
  count: number;
  minScore?: number;
}

export interface SearchFilterState {
  maxPrice: number;
  selectedStarRating: number | null;
  propertyTypes: string[];
  guestRating: string;
  selectedAmenities: string[];
}
