import React, { useState } from 'react';

interface SearchCardProps {
  onSearch?: (searchParams: {
    location: string;
    dates: string;
    guests: string;
  }) => void;
}

export const SearchCard: React.FC<SearchCardProps> = ({ onSearch }) => {
  const [location, setLocation] = useState('Đà Nẵng, Việt Nam');
  const [dates, setDates] = useState('15 Th04 - 18 Th04');
  const [stayDuration] = useState('3 đêm');
  const [guests, setGuests] = useState('2 người lớn · 1 phòng');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ location, dates, guests });
    }
  };

  return (
    <section className="relative z-20 max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin -mt-20 md:-mt-24">
      <div className="bg-surface-container-lowest rounded-2xl md:rounded-full p-3 md:p-3 shadow-xl shadow-stone-900/5 transition-all">
        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-2 p-1.5 md:p-1"
        >
          {/* Location */}
          <div className="flex-1 flex items-center gap-3.5 p-3 md:px-5 rounded-xl md:rounded-full hover:bg-surface-container-low transition-colors cursor-pointer group min-w-0">
            <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary text-secondary transition-colors">
              <span className="material-symbols-outlined text-[22px]">location_on</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Địa điểm
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="font-body-lg text-body-lg text-on-surface font-medium truncate bg-transparent border-0 p-0 focus:outline-none focus:ring-0 w-full"
                placeholder="Nhập địa điểm nghỉ dưỡng..."
              />
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-surface-container-highest my-auto shrink-0" />

          {/* Dates */}
          <div className="flex-1 flex items-center gap-3.5 p-3 md:px-5 rounded-xl md:rounded-full hover:bg-surface-container-low transition-colors cursor-pointer group min-w-0">
            <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary text-secondary transition-colors">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Ngày nhận - trả phòng
              </span>
              <div className="font-body-md text-body-md text-on-surface font-medium truncate">
                <input
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  className="bg-transparent border-0 p-0 font-body-md text-body-md text-on-surface font-medium focus:outline-none w-32"
                />
                <span className="text-on-surface-variant text-label-sm font-normal">
                  ({stayDuration})
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-surface-container-highest my-auto shrink-0" />

          {/* Guests & Rooms */}
          <div className="flex-1 flex items-center gap-3.5 p-3 md:px-5 rounded-xl md:rounded-full hover:bg-surface-container-low transition-colors cursor-pointer group min-w-0">
            <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary text-secondary transition-colors">
              <span className="material-symbols-outlined text-[22px]">group</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Khách & Phòng
              </span>
              <input
                type="text"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="font-body-md text-body-md text-on-surface font-medium truncate bg-transparent border-0 p-0 focus:outline-none focus:ring-0 w-full"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="shrink-0 p-1 flex items-center justify-center">
            <button
              type="submit"
              className="w-full md:w-auto h-12 md:h-13 bg-primary hover:bg-primary-container text-on-primary rounded-xl md:rounded-full px-7 py-3 flex items-center justify-center gap-2 font-label-lg text-label-lg font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all cursor-pointer border-0"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span>Tìm kiếm</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
export default SearchCard;
