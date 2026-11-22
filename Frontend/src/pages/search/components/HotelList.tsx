import React from 'react';
import { Hotel } from '../types';
import { HotelCard } from './HotelCard';
import { Pagination } from './Pagination';
import { useLanguage } from '../../../i18n/LanguageContext';

interface HotelListProps {
  hotels: Hotel[];
  currentPage?: number;
  totalPages?: number;
  totalResults?: number;
  onPageChange?: (page: number) => void;
  onSelectHotel?: (hotel: Hotel) => void;
  onFavoriteToggle?: (hotelId: string, isFav: boolean) => void;
}

const PAGE_SIZE = 12;

export const HotelList: React.FC<HotelListProps> = ({ hotels, currentPage = 1, totalPages = 1, totalResults = 0, onPageChange, onSelectHotel, onFavoriteToggle }) => {
  const { t } = useLanguage();
  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest p-10 text-center shadow-sm">
        <span className="material-symbols-outlined text-[48px] text-outline-variant">hotel</span>
        <h3 className="text-lg font-semibold text-on-surface">{t('search.noResults')}</h3>
        <p className="max-w-md text-sm text-on-surface-variant">{t('search.noResultsHint')}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {hotels.map((hotel) => (
        <HotelCard key={hotel.id} hotel={hotel} onSelect={onSelectHotel} onFavoriteToggle={onFavoriteToggle} showFavorite={Boolean(onFavoriteToggle)} />
      ))}
      <Pagination currentPage={currentPage} totalPages={totalPages}
        startItem={(currentPage - 1) * PAGE_SIZE + 1} endItem={(currentPage - 1) * PAGE_SIZE + hotels.length}
        totalItems={totalResults} onPageChange={onPageChange} />
    </div>
  );
};
export default HotelList;
