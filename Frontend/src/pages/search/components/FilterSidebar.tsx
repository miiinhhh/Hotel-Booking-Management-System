import React from 'react';
import {
  PROPERTY_TYPE_FILTERS,
  GUEST_RATING_FILTERS,
  AVAILABLE_AMENITIES,
} from '../data/mockHotels';
import { SearchFilterState } from '../types';

interface FilterSidebarProps {
  filters: SearchFilterState;
  onFilterChange: (filters: SearchFilterState) => void;
  onResetFilters: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      maxPrice: Number(e.target.value),
    });
  };

  const handleStarClick = (star: number) => {
    onFilterChange({
      ...filters,
      selectedStarRating: filters.selectedStarRating === star ? null : star,
    });
  };

  const handlePropertyTypeToggle = (typeId: string) => {
    const isChecked = filters.propertyTypes.includes(typeId);
    const updated = isChecked
      ? filters.propertyTypes.filter((t) => t !== typeId)
      : [...filters.propertyTypes, typeId];
    onFilterChange({
      ...filters,
      propertyTypes: updated,
    });
  };

  const handleGuestRatingChange = (ratingId: string) => {
    onFilterChange({
      ...filters,
      guestRating: ratingId,
    });
  };

  const handleAmenityToggle = (amenity: string) => {
    const isSelected = filters.selectedAmenities.includes(amenity);
    const updated = isSelected
      ? filters.selectedAmenities.filter((a) => a !== amenity)
      : [...filters.selectedAmenities, amenity];
    onFilterChange({
      ...filters,
      selectedAmenities: updated,
    });
  };

  return (
    <aside className="lg:col-span-4 xl:col-span-3">
      <div className="sticky top-28 bg-surface-container-lowest p-space-md rounded-lg shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] flex flex-col gap-space-lg">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">
              tune
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Bộ lọc tìm kiếm
            </h2>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="font-label-sm text-label-sm text-primary hover:text-on-primary-fixed-variant transition-colors uppercase tracking-wider font-semibold cursor-pointer border-0 bg-transparent"
          >
            Đặt lại
          </button>
        </div>

        {/* Price Range Slider */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">
            Khoảng giá mỗi đêm
          </span>
          <div className="flex items-center justify-between font-label-md text-label-md text-on-surface font-medium">
            <span className="px-space-sm py-1 rounded-full bg-surface-container-low text-on-surface">
              500.000đ
            </span>
            <span className="text-outline-variant">–</span>
            <span className="px-space-sm py-1 rounded-full bg-surface-container-low text-primary font-semibold">
              {filters.maxPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="relative w-full py-2">
            <input
              type="range"
              min="500000"
              max="15000000"
              step="250000"
              value={filters.maxPrice}
              onChange={handlePriceChange}
              className="w-full accent-primary-container h-1.5 bg-surface-container rounded-full cursor-pointer appearance-none"
            />
          </div>
          <div className="flex justify-between font-label-sm text-label-sm text-outline">
            <span>500k</span>
            <span>15.000k+</span>
          </div>
        </div>

        {/* Star Rating Selector */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">
            Hạng khách sạn
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const isSelected = filters.selectedStarRating === star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-full transition-colors cursor-pointer border-0 ${
                    isSelected
                      ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span
                    className={`font-label-sm text-label-sm ${
                      isSelected ? 'font-semibold' : 'font-semibold'
                    }`}
                  >
                    {star}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      isSelected ? 'text-on-primary' : 'text-secondary-container'
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Property Types */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">
            Loại chỗ nghỉ
          </span>
          <div className="flex flex-col gap-2">
            {PROPERTY_TYPE_FILTERS.map((prop) => {
              const isChecked = filters.propertyTypes.includes(prop.id);
              return (
                <label
                  key={prop.id}
                  className="flex items-center justify-between cursor-pointer group py-1 select-none"
                >
                  <span className="flex items-center gap-space-xs">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePropertyTypeToggle(prop.id)}
                      className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                    />
                    <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                      {prop.label}
                    </span>
                  </span>
                  <span className="font-label-sm text-label-sm text-outline">
                    {prop.count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Guest Rating Filter */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">
            Đánh giá của khách
          </span>
          <div className="flex flex-col gap-2">
            {GUEST_RATING_FILTERS.map((rating) => {
              const isChecked = filters.guestRating === rating.id;
              return (
                <label
                  key={rating.id}
                  className="flex items-center justify-between cursor-pointer group py-1 select-none"
                >
                  <span className="flex items-center gap-space-xs">
                    <input
                      type="radio"
                      name="rating-filter"
                      value={rating.id}
                      checked={isChecked}
                      onChange={() => handleGuestRatingChange(rating.id)}
                      className="w-4 h-4 accent-primary-container cursor-pointer"
                    />
                    <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                      {rating.label}
                    </span>
                  </span>
                  <span
                    className={`font-label-sm text-label-sm ${
                      isChecked
                        ? 'text-primary font-bold'
                        : 'text-outline'
                    }`}
                  >
                    {rating.count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Highlight Amenities Chips */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">
            Tiện ích ưu tiên
          </span>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_AMENITIES.map((amenity) => {
              const isSelected = filters.selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => handleAmenityToggle(amenity)}
                  className={`px-space-sm py-1 rounded-full font-label-sm text-label-sm font-medium flex items-center gap-1 cursor-pointer transition-colors border-0 ${
                    isSelected
                      ? 'bg-primary-fixed text-on-primary-fixed shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px]">
                      check
                    </span>
                  )}
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
export default FilterSidebar;
