import React from 'react';
import { HeroBanner } from './components/HeroBanner';
import { SearchCard } from './components/SearchCard';
import { QuickFilters } from './components/QuickFilters';
import { PopularDestinations } from './components/PopularDestinations';
import { PrivilegeBanner } from './components/PrivilegeBanner';

interface DashboardProps {
  onNavigateSearch?: (params: {
    location: string;
    dates: string;
    guests: string;
  }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateSearch }) => {
  const handleSearch = (searchParams: {
    location: string;
    dates: string;
    guests: string;
  }) => {
    if (onNavigateSearch) {
      onNavigateSearch(searchParams);
    }
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
