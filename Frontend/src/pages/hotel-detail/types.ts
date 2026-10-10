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
  id: string;
  name: string;
  tag: string;
  floor: string;
  remainingRooms: number;
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
