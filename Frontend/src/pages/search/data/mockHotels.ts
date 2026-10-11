import { Hotel, PropertyTypeFilter, GuestRatingFilter } from '../types';

export const MOCK_HOTELS: Hotel[] = [
  {
    id: 'intercontinental-danang',
    name: 'InterContinental Danang Sun Peninsula Resort',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDvYBay-KDiIrcvvkWi27_da1G4fDbEhPz1JFP2VouEQC6Hnbjhl_XKbdvXXIsP5bZtEoP0rW1yENNT7rQgxYKTwiJ_XI17XmQprXPmnSpgOCjVE1V9MDB5oXwcn6AhQs8ee4SVX3iQsA4UFfmlAN_dDh0mDMH7wfQ1zoBHat1GT10qs0RcFeyMlbolOxNl6tejbA2lL-4IlmSHibV6tl99g1p_6pfFQDn9UTwuvlRl',
    imageAlt:
      'InterContinental Danang Sun Peninsula Resort nestled on lush tropical jungle hillside overlooking pristine emerald ocean bay with architecture by Bill Bensley, warm sunset ambient glow, terracotta ceramic elements, luxury infinity pool, editorial travel photography.',
    badge: 'Ưu đãi độc quyền',
    badgeVariant: 'primary',
    location: 'Bán đảo Sơn Trà, Đà Nẵng',
    distanceInfo: 'Cách biển 50m',
    starRating: 5,
    amenities: [
      { icon: 'restaurant', text: 'Bữa sáng buffet thượng hạng' },
      { icon: 'pool', text: 'Hồ bơi vô cực hướng vịnh' },
      { icon: 'done', text: 'Miễn phí hủy phòng', isHighlight: true },
    ],
    featuredRoomType: 'Biệt thự hướng biển có hồ bơi riêng',
    ratingScore: 9.6,
    ratingText: 'Xuất sắc',
    reviewCount: 1420,
    originalPrice: 8500000,
    pricePerNight: 6800000,
    isFavorite: true,
  },
  {
    id: 'furama-resort-danang',
    name: 'Furama Resort Danang',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB2OP_k2KlVKWXs6R3adEFyQRnS9U7HjYakpHLzsd2DSbQ0WYlpnXso94EaRlOx6UOO35tiXd4yZ2JQNVwqVXItGPigfM-DID97PI-CwSH-W-yDioPWW8XP_hR7STym8OncSDYmnO6WiOywHnWEOj67WrogFEYoeS18KBPjEx7sUEyjkVvX4DdjxNlfJn8heyEOJZN8uEqMRQyE7tR5KrX8bhJcuuxvrDxkaJkKOPTo',
    imageAlt:
      'Furama Resort Danang expansive tropical lagoon pool surrounded by lush palm trees, stone pathways, luxury beach cabanas under golden afternoon sunshine, warm earth architectural tones, serene retreat mood.',
    badge: 'Bán chạy nhất',
    badgeVariant: 'neutral',
    location: 'Bãi biển Mỹ Khê, Đà Nẵng',
    distanceInfo: 'Giáp bãi cát riêng',
    starRating: 5,
    amenities: [
      { icon: 'spa', text: 'Spa trị liệu thảo mộc' },
      { icon: 'water', text: 'Hồ bơi lagoon nhiệt đới' },
      { icon: 'airport_shuttle', text: 'Đưa đón sân bay riêng' },
    ],
    featuredRoomType: 'Phòng Deluxe hướng vườn nhiệt đới',
    ratingScore: 9.1,
    ratingText: 'Tuyệt vời',
    reviewCount: 980,
    pricePerNight: 3450000,
    isFavorite: false,
  },
  {
    id: 'tms-hotel-danang',
    name: 'TMS Hotel Da Nang Beach',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDQg1fxBMR9ETINNi-N4awp4xD8tMp4E-yTUWbc6GSLpsW2Eq9wXlZuqyDFkcczMrQHRFt0VxfbShpFSNqkAMcW2E7S2vLrLi_9f27kv8-_Iw4jLcUK7bq6jk9XQvWe1lQMEPwYD7UEtbK5KG3Nlcc0Ox0M2hkmU6mnQnfaWWnBLtw1idTmFfqnr8KRgQyQtz-a1WHmpHLw1ZXInwAEtXiMYidLTWdDN_brBzrxUv59',
    imageAlt:
      'TMS Hotel Da Nang Beach modern luxury high-rise oceanfront facade with a panoramic rooftop infinity swimming pool overlooking My Khe beach, clear azure sky, minimalist luxury aesthetic with warm ochre highlights.',
    location: 'Võ Nguyên Giáp, Mỹ Khê, Đà Nẵng',
    starRating: 5,
    amenities: [
      { icon: 'pool', text: 'Hồ bơi sân thượng 360°' },
      { icon: 'bakery_dining', text: 'Bữa sáng miễn phí' },
      { icon: 'wifi', text: 'Wifi tốc độ cao' },
    ],
    featuredRoomType: 'Phòng Premier Ocean View',
    ratingScore: 8.9,
    ratingText: 'Tuyệt vời',
    reviewCount: 2150,
    pricePerNight: 1950000,
    isFavorite: false,
  },
  {
    id: 'naman-retreat-danang',
    name: 'Naman Retreat Đà Nẵng',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBcos_fRj4VG2_Ef8rUuW1oXC7A6chmTqMUGDwLYqbzIfjsIeZMKVf-gp0LWHrgfD968NCXc45TrA3gyyRBN4U14P_nfdJUoMmuhq_pJa-NIIjX3IV88vW-rBAY-EEylRU1OcW96eYV2vAJByKjDJq4SpPUvaqttSKhw3r64QA2KED4fjCatDZY96EsavRnsXHhL-Qc9VNSs0Ma4uqftXM1mzdZMtkkiIkUyWQWTceU',
    imageAlt:
      'Naman Retreat Da Nang organic sculptural bamboo architecture, serene private villa pool, warm stone accents, natural linen loungers, peaceful zen sanctuary aesthetic in afternoon golden light.',
    location: 'Đường Trường Sa, Ngũ Hành Sơn',
    starRating: 5,
    amenities: [
      { icon: 'self_improvement', text: 'Liệu trình Spa miễn phí' },
      { icon: 'villa', text: 'Biệt thự riêng tư' },
      { icon: 'beach_access', text: 'Bãi biển biệt lập' },
    ],
    featuredRoomType: 'One-Bedroom Pool Villa',
    ratingScore: 9.3,
    ratingText: 'Xuất sắc',
    reviewCount: 860,
    pricePerNight: 4890000,
    isFavorite: false,
  },
];

export const PROPERTY_TYPE_FILTERS: PropertyTypeFilter[] = [
  { id: 'resort', label: 'Resort nghỉ dưỡng', count: 48 },
  { id: 'villa', label: 'Biệt thự / Villa', count: 26 },
  { id: 'luxury5', label: 'Khách sạn cao cấp 5★', count: 54 },
  { id: 'apartment', label: 'Căn hộ dịch vụ biển', count: 14 },
];

export const GUEST_RATING_FILTERS: GuestRatingFilter[] = [
  { id: '9plus', label: '9+ Tuyệt hảo & Xuất sắc', count: 42, minScore: 9.0 },
  { id: '8plus', label: '8+ Rất tốt', count: 89, minScore: 8.0 },
  { id: 'all', label: 'Tất cả đánh giá', count: 142, minScore: 0 },
];

export const AVAILABLE_AMENITIES = [
  'Hủy miễn phí',
  'Bao gồm bữa sáng',
  'Hồ bơi vô cực',
  'Giáp mặt biển',
  'Thanh toán tại chỗ',
];
