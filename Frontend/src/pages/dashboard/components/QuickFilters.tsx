import React, { useState } from 'react';

interface QuickFiltersProps {
  onFilterChange?: (filterId: string) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({ onFilterChange }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('beach-villa');

  const filters = [
    { id: 'beach-villa', label: 'Biệt thự biển', icon: 'verified' },
    { id: 'infinity-pool', label: 'Hồ bơi vô cực' },
    { id: 'mountain-resort', label: 'Nghỉ dưỡng đồi núi' },
    { id: 'breakfast-included', label: 'Bao gồm bữa sáng 5 sao' },
    { id: 'flexible-cancel', label: 'Chính sách hoàn hủy linh hoạt' },
  ];

  const handleSelect = (id: string) => {
    setSelectedFilter(id);
    if (onFilterChange) {
      onFilterChange(id);
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin mt-10">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        <span className="font-label-md text-label-md text-on-surface-variant shrink-0 mr-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">tune</span>
          Bộ lọc nhanh:
        </span>

        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => handleSelect(filter.id)}
              className={`shrink-0 px-4 py-2 rounded-full font-label-sm text-label-sm transition-colors flex items-center gap-1.5 border-0 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface font-medium'
              }`}
            >
              {filter.icon && (
                <span className="material-symbols-outlined text-[15px]">
                  {filter.icon}
                </span>
              )}
              {filter.label}
            </button>
          );
        })}
      </div>
    </section>
  );
};
export default QuickFilters;
