import { HotelDetail } from '../types';

export const MOCK_HOTEL_DETAIL: HotelDetail = {
  id: 'intercontinental-danang',
  name: 'InterContinental Danang Sun Peninsula Resort',
  categoryTag: 'Khu Nghỉ Dưỡng Sanctuary',
  starRating: 5,
  address: 'Bãi Bắc, Bán đảo Sơn Trà, TP. Đà Nẵng',
  distanceToBeach: 'Cách biển riêng 50m',
  ratingScore: 9.6,
  ratingText: 'Xuất sắc',
  reviewCount: 1420,
  galleryImages: {
    hero: {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPTZ1Do0yX7IWQYe890swOrAcpJ_0HsZ6zXNK8Ai1hAaruVfyoMd2M5541gRaVoor8fb9TI7jfobOHNsPGgUywmEopfW-JTMlzswXP7dJ898WplyzW-imfCN3DpM33CA0ZUVXRj7wp6O0BR5gKoC0kduT6-SQIF1-6DTSzfc8rjAVtUCVF_8O7pDQgKfx1O0Adx8oE1F9HkHly0yH3N5Ifpsk9DQmfINxuGvHtyL32',
      caption: 'Toàn cảnh khu nghỉ dưỡng nhìn từ trên cao',
      badge: 'Kiến trúc Bill Bensley Tuyệt tác',
    },
    thumbnails: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9crTLg25WLRFlz5QdBkX1MEmzSaymXSCUVsh8fUD4My8TOctgps7UrIJFwjEsj11i877thzINJZc9J2I1twYBZOvGV7QnbM_VYysWuEZPJk9joqUR6K7dpVif5e3SaLMLid3PoPM8-6ZuA7jpNXhdviLL2II5H9PTAJ5ePWiAzVm2G1WfAwY5innJmsquWyl-LVcKVE0g2TxCfwXW5PhYxEVtXtq2k4QjrpgUqTLe',
        caption: 'Phòng Suite Hướng Biển',
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwMdeFYsOkM6FnDps5vcFiCGaK6bh_jnhJ6oYcuRPJPOI60GpO6tyNE32aYaIQ_D-n5Oa_Fcm7XBWbtLHaPwx7CkWTZrPcfRqMdEJlla6DfVd8RzYv9dvm6j6WTCsB159BFcdvP2OS9ptMP8L4vLhOXwWW3UCcrfnY16jpFamozLfyvU8vaJsCaem3bd12vWlHiVSrpqT7LtPCOWRYMaXyb4U5ydS-ylOV3byT5eMQ',
        caption: 'Bãi biển riêng tư',
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOov4z_pQZ1nfNlOmy7ri-hCRayEXQwfXhm3_Tn80EXJ8SFI68ySbBPYvRSuzcUT5OFyS-7Vtl5H6aevQcCfAn8Yf67Zfx2iz4f9V8M037aX9Z4IET5Xl73ecgiCL98v3dIDXZKjCQSQoUOeSyjeeRfOXGvCptu9s0Cxy6HyeEKck5eziyVwYDauwRr7yPs3o8zYNptPIrPDY077qDx9gK8DuZ2BPJ8Jrf5PG-8uDi',
        caption: 'Ẩm thực La Maison 1888',
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAB8K1Wj9nTSsQBzic86BrN1CREDcebu_xkN5iyn_vbdpakv7GYNLnHWDHOXvT1jqT7kNTYH0MVYtKl06TUdWCdYt8rFMHMbu51lx4q6wvF6Y9busV1UNjzpCMWMD1jNqwzqMsO4Q6pvI5LXaJjebTQRcDXol82dKJq2tkP0hQ5wmKNoRkwyYeEXxqCEWq_g8-O4YpDZyirch5OPqQSJGFxdqSOMnaoe1Fj8_AQmTCg',
        caption: 'Mi Sol Spa Trị Liệu',
      },
    ],
    totalCount: 48,
  },
  checkInTime: '14:00',
  checkOutTime: '12:00',
  cancelPolicySummary: 'Hủy phòng miễn phí trước 24h',
  datesText: '15/04 — 18/04 · 3 đêm',
  durationNights: 3,
  guestsText: '2 người lớn',
  resortAmenities: [
    {
      icon: 'pool',
      title: 'Hồ bơi vô cực',
      subtitle: 'Tầm nhìn 180°',
    },
    {
      icon: 'spa',
      title: 'Mi Sol Spa',
      subtitle: 'Trị liệu thảo mộc',
    },
    {
      icon: 'directions_car',
      title: 'Đưa đón riêng',
      subtitle: 'Mercedes VIP',
    },
    {
      icon: 'beach_access',
      title: 'Bãi biển 700m',
      subtitle: 'Cát trắng mịn',
    },
    {
      icon: 'wifi',
      title: 'Wi-Fi Tốc độ cao',
      subtitle: 'Phủ sóng toàn khu',
    },
    {
      icon: 'local_bar',
      title: 'The Long Bar',
      subtitle: 'Cocktail bãi biển',
    },
  ],
  rooms: [
    {
      id: 'villa-sun-peninsula',
      name: 'Biệt Thự Hướng Biển Có Hồ Bơi Riêng (Sun Peninsula Villa)',
      tag: 'Biệt thự đắt giá nhất',
      floor: 'Tầng Heaven (Trời)',
      remainingRooms: 2,
      remainingBadgeColor: 'error',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCAjwZycfXgwwUEdEalfnCoLAhfjGXn9AX8DiSTder_c3LJY98F1XezMBCVcYXU983_13_DsuhvkVyCvoDp9izddW5zWEGXj91IMozbTIgVoDoKml_nzjIM7PnBAh-yGImOEEjvlrVKalTxn0I4MiHW8Ah4SwEO-hgL3CtuBNpU0sa4fJMCb2kMaMT19BSy9iiZv7aleAYWAKxJw7MLE7BxEtL1PziNxEq3Uh-OosJV',
      specs: [
        { icon: 'king_bed', text: '1 Giường King cực lớn' },
        { icon: 'square_foot', text: '145 m²' },
        { icon: 'group', text: '2 Người lớn + 1 Trẻ' },
        { icon: 'visibility', text: 'View toàn cảnh biển' },
      ],
      features: [
        { icon: 'waves', text: 'Hồ bơi vô cực riêng' },
        { icon: 'bathtub', text: 'Bồn tắm hướng biển' },
        { icon: 'deck', text: 'Ban công rộng rãi' },
        { icon: 'wine_bar', text: 'Quầy bar mini miễn phí' },
      ],
      packages: [
        {
          id: 'pkg-standard',
          name: 'Gói Phòng Tiêu Chuẩn',
          description: 'Không bao gồm bữa sáng',
          pricePerNight: 6800000,
        },
        {
          id: 'pkg-full',
          name: 'Gói Nghỉ Dưỡng Trọn Vẹn',
          description: 'Kèm bữa sáng buffet thượng hạng & trà chiều',
          pricePerNight: 7600000,
          badge: 'Gợi ý chọn',
          isRecommended: true,
        },
      ],
      cancellationPolicy: 'Hủy miễn phí trước ngày 14/04',
      urgencyNote: 'Chỉ mất 2 phút để hoàn tất',
    },
    {
      id: 'room-classic-ocean',
      name: 'Phòng Resort Classic Hướng Biển (Classic Ocean View King)',
      tag: 'Được yêu thích nhất',
      floor: 'Tầng Sky & Earth',
      remainingRooms: 4,
      remainingBadgeColor: 'secondary',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDm9cyJNzHGQfMagM71MhRBXt0zNU4Kza_DPnhFzU0x1Qi0f4NHkxGMVwtArFYFlCBOCcOM7rU8AKFE27RHnUAsTDQZSskBl1dd4UA9qFF7ByBmYRbz2YZsSL6CmnZ9OaBsbZ9orks7Z7cQggBLEA-r-nwtDn1Yu0kWa6eDJV1t7WsaFiqVBybX_57LCca20PhL4dA43PlSkPoND15WuY9Pop1ikT0WyViDQJdua18N',
      specs: [
        { icon: 'king_bed', text: '1 King hoặc 2 Đơn' },
        { icon: 'square_foot', text: '70 m²' },
        { icon: 'group', text: 'Tối đa 2 người lớn' },
        { icon: 'wb_twilight', text: 'Ban công hoàng hôn' },
      ],
      features: [
        { icon: 'bathtub', text: 'Bồn tắm đá cẩm thạch' },
        { icon: 'coffee_maker', text: 'Máy pha cà phê cao cấp' },
        { icon: 'soap', text: 'Đồ vệ sinh cá nhân cao cấp' },
      ],
      packages: [
        {
          id: 'pkg-basic',
          name: 'Gói Phòng Cơ Bản',
          description: 'Không bao gồm ăn sáng',
          pricePerNight: 4200000,
        },
        {
          id: 'pkg-gourmet',
          name: 'Gói Kèm Ẩm Thực',
          description: 'Bao gồm buffet sáng tại Citron',
          pricePerNight: 4850000,
          badge: 'Phổ biến',
          isRecommended: true,
        },
      ],
      cancellationPolicy: 'Hủy linh hoạt trong 24h',
      urgencyNote: 'Xác nhận đặt tức thì',
    },
    {
      id: 'villa-royal-2br',
      name: 'Biệt Thự Gia Đình 2 Phòng Ngủ Có Hồ Bơi (Two-Bedroom Royal Villa)',
      tag: 'Đặc quyền Hoàng Gia',
      floor: 'Tầng Sea độc quyền',
      remainingRooms: 1,
      remainingBadgeColor: 'error',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDKltHPn3ORIMdjScqmPneByB9FivTYp2aF8yqHJcrle9BB-5v2bwTB4BHVtaMYABgfNG1V5kxjYDY9GIlIb2xMSAHiV_iwnUtbHxtx5nq_B8M2ZYD_givsemT0Zb59q1UD6tqTpJrXg-FZ7djZDkW_5tBfX46pMrw4G75Z6fFlbiT-I1G8SHz-w5bUT8ygAUbdy8d9ueo8tE1bfwSzloU4YLWkwSHH9Zm0kYcMg8tV',
      specs: [
        { icon: 'bed', text: '2 Giường King lớn' },
        { icon: 'square_foot', text: '260 m²' },
        { icon: 'diversity_3', text: '4 Lớn + 2 Trẻ em' },
        { icon: 'room_service', text: 'Quản gia riêng 24/7' },
      ],
      features: [
        { icon: 'pool', text: 'Hồ bơi riêng 2 tầng' },
        { icon: 'kitchen', text: 'Khu vực bếp riêng biệt' },
        { icon: 'airport_shuttle', text: 'Đón tiễn sân bay 2 chiều' },
      ],
      allInclusiveDetail: {
        title: 'Đặc quyền thượng lưu trọn gói',
        description:
          'Bao gồm bữa sáng thượng hạng cho 4 khách & dịch vụ quản gia cá nhân phục vụ xuyên suốt kỳ nghỉ.',
        pricePerNight: 13200000,
      },
      cancellationPolicy: 'Bảo đảm quyền lợi VIP',
      urgencyNote: 'Dịch vụ concierge liên hệ sau 10p',
    },
  ],
};
