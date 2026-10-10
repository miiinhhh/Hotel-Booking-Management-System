import React from 'react';
import { Hotel } from '../types';
import { HotelCard } from './HotelCard';
import { Pagination } from './Pagination';

interface HotelListProps {
  hotels: Hotel[];
  currentPage?: number;
  totalPages?: number;
  totalResults?: number;
  onPageChange?: (page: number) => void;
  onSelectHotel?: (hotel: Hotel) => void;
  onFavoriteToggle?: (hotelId: string, isFav: boolean) => void;
}

export const HotelList: React.FC<HotelListProps> = ({
  hotels,
  currentPage = 1,
  totalPages = 12,
  totalResults = 142,
  onPageChange,
  onSelectHotel,
  onFavoriteToggle,
}) => {
  return (
    <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-space-md">
      {/* Hotel Cards */}
      {hotels.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg p-10 text-center flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[48px] text-outline">
            hotel
          </span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Không tìm thấy nơi nghỉ phù hợp
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Hãy thử điều chỉnh lại bộ lọc giá, hạng sao hoặc tiện ích để xem thêm
            kết quả.
          </p>
        </div>
      ) : (
        hotels.map((hotel) => (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            onSelect={onSelectHotel}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))
      )}

      {/* Pagination Section */}
      {hotels.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startItem={1}
          endItem={hotels.length}
          totalItems={totalResults}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
};
export default HotelList;
