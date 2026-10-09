import React from 'react';
import { HeroBanner } from './components/HeroBanner';
import { SearchCard } from './components/SearchCard';
import { QuickFilters } from './components/QuickFilters';
import { PopularDestinations } from './components/PopularDestinations';
import { PrivilegeBanner } from './components/PrivilegeBanner';

export const Dashboard: React.FC = () => {
  const handleSearch = (searchParams: {
    location: string;
    dates: string;
    guests: string;
  }) => {
    console.log('Searching hotels with params:', searchParams);
  };

  const handleFilterChange = (filterId: string) => {
    console.log('Selected filter:', filterId);
  };

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full relative">
        {/* HERO BANNER */}
        <HeroBanner />

        {/* FLOATING SEARCH CARD */}
        <SearchCard onSearch={handleSearch} />

        {/* QUICK FILTERS PILLS */}
        <QuickFilters onFilterChange={handleFilterChange} />

        {/* POPULAR DESTINATIONS */}
        <PopularDestinations />

        {/* CURATED PRIVILEGES BANNER */}
        <PrivilegeBanner />
      </div>
    </main>
  );
};
export default Dashboard;
