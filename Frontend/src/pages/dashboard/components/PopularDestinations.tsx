import React, { useRef } from 'react';

export interface DestinationItem {
  id: string;
  name: string;
  description: string;
  propertiesCount: string;
  startingPrice: string;
  imageUrl: string;
  imageAlt: string;
  link?: string;
}

const defaultDestinations: DestinationItem[] = [
  {
    id: 'son-tra',
    name: 'Bán đảo Sơn Trà',
    description: 'Rừng nguyên sinh & Vịnh biển riêng tư',
    propertiesCount: '58 chỗ nghỉ',
    startingPrice: 'Giá chỉ từ 4.250.000₫/đêm',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCtZAKdymE46puLGdWc9bEpKKkpSfh3oeIcQibOnjt-9lvwKHKi95i0cSWsdpAE0Xh6Q1Frki2iqFhWwNTNp6eN53kD67WZiqCYrXQUUFMZyDH5-mPlx72m0O7BvKletJgNycTYF84KYdU805sz46NeS_UMWOwWoMlKV14wphXEBKLGf52xafy3vjnDHhyuh7NHBqfOYzKZP2bOw8rbm-iUZiPlZcjh2FTv4uPC-hK7',
    imageAlt:
      'Luxury villa nestled in lush green coastal cliffs of Son Tra Peninsula overlooking secluded turquoise bay in Da Nang Vietnam',
  },
  {
    id: 'my-khe',
    name: 'Bãi biển Mỹ Khê',
    description: 'Cung đường biển sôi động & Khách sạn sang trọng',
    propertiesCount: '340 chỗ nghỉ',
    startingPrice: 'Giá chỉ từ 1.850.000₫/đêm',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAn0I30kJ8_v7Q3qvT9RMME_AtaCOtYHksPDDa6xXu1y90yv-mvnjqXH0qx0KfegViR21fvfG_Gf20RiFtQPQSPldCS7lveInqMGUWlkpShVJNyprWcpS5n8ikJZ5nI-9ThBepn5XyproobvCDTb-DzvPQJqPDugte9eqaacNg6Ht_V8Q2XnbHe5jg6fnuRhvrLu9Jq2FHn-xdUWll9mx0zmsMz9_I-IQyp9EJh8UBn',
    imageAlt:
      'Stunning panoramic view of My Khe beach Da Nang with luxury high-rise hotels along pristine sandy shore at golden hour',
  },
  {
    id: 'non-nuoc',
    name: 'Non Nước & Ngũ Hành Sơn',
    description: 'Thiên đường resort nghỉ dưỡng ven biển & Chữa lành',
    propertiesCount: '115 chỗ nghỉ',
    startingPrice: 'Giá chỉ từ 2.650.000₫/đêm',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2PXBDH0FZ1Cp1r9SihY6cXglgavg_xOwktZVnWuvXOp1vQHujevMQRGGs2TV0KIDzCZ5JOLiJT0pLz2TwMXlOcvOKLgA0tz0NbLvq3dYLijcyCsliWTxR8ZRT7JPrmZi-VJi2IqvF6MnWjC8FRfAA_Een_bXeihMO3Cj-oOYkg6vSDkKJRhNgIqEpkcRtzUcYvIvgdXTiUtLB5JVJ79BIxh8s1BuCemz-jQiWR_o',
    imageAlt:
      'Serene wellness beach resort in Non Nuoc Marble Mountains area Da Nang with palm trees and oceanfront pool',
  },
  {
    id: 'song-han',
    name: 'Sông Hàn & Trung tâm',
    description: 'Tầm nhìn pháo hoa, cầu Rồng & Ẩm thực đêm',
    propertiesCount: '45 chỗ nghỉ',
    startingPrice: 'Giá chỉ từ 1.450.000₫/đêm',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA82JPLeKt-8W5P_Hk8kxCsdStzRuw08KWZDMy4tV3uf6SD_6E2FwJ4WHr2vgGp7l3c9QBOu4V-tBmYAMK5k0e0l8XUXHkzclOm7vcJy6Y_oO648LUqtr031c_16xr6TPNyTbIL5rZ69z72gNOhLZiVSSACqVa-UPsHbsPKa3Bj7uv1z8uc2ckoJf1gjPzHuiYRYUo8PzDPjVZdXQWDSY4SuBtMUXX7MAdWTfxkPfvb',
    imageAlt:
      'Spectacular city view luxury hotel terrace facing Han River illuminated Dragon Bridge Da Nang at twilight',
  },
];

interface PopularDestinationsProps {
  destinations?: DestinationItem[];
  onSelectDestination?: (dest: DestinationItem) => void;
}

export const PopularDestinations: React.FC<PopularDestinationsProps> = ({
  destinations = defaultDestinations,
  onSelectDestination,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin mt-20 md:mt-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">
              Khám phá Đà Nẵng
            </span>
          </div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">
            Các khu vực nghỉ dưỡng hàng đầu tại Đà Nẵng
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
            Từ vẻ đẹp hoang sơ của Bán đảo Sơn Trà đến bãi cát vàng Mỹ Khê và chốn bồng lai Bà Nà
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Cuộn sang trái"
            className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors border-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Cuộn sang phải"
            className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors border-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div
        ref={containerRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {destinations.map((destination) => (
          <a
            key={destination.id}
            href={destination.link || '#'}
            onClick={(e) => {
              if (onSelectDestination) {
                e.preventDefault();
                onSelectDestination(destination);
              }
            }}
            className="group relative rounded-2xl overflow-hidden bg-surface-container-low aspect-[3/4] flex flex-col justify-end p-6 shadow-sm hover:shadow-xl transition-all duration-500 no-underline"
          >
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              data-alt={destination.imageAlt}
              style={{ backgroundImage: `url('${destination.imageUrl}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />
            <div className="relative z-10 flex flex-col">
              <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md mb-3">
                <span className="material-symbols-outlined text-primary text-[14px]">hotel</span>
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                  {destination.propertiesCount}
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md text-white font-semibold tracking-tight group-hover:translate-x-1 transition-transform">
                {destination.name}
              </h3>
              <p className="font-body-md text-body-md text-stone-300 font-light mt-0.5">
                {destination.description}
              </p>
              <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="font-label-sm text-label-sm text-stone-200">
                  {destination.startingPrice}
                </span>
                <span className="material-symbols-outlined text-white text-[18px]">
                  arrow_forward
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
export default PopularDestinations;
