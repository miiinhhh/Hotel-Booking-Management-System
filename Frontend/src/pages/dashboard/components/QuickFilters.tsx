import React from 'react';
interface QuickFiltersProps { locations: string[]; onLocationSelect?: (location: string) => void }
export const QuickFilters: React.FC<QuickFiltersProps> = ({ locations, onLocationSelect }) => {
  if (!locations.length) return null;
  return <section className="mx-auto mt-10 w-full max-w-[1440px] px-5"><div className="flex flex-wrap items-center gap-3"><span className="text-on-surface-variant">Khám phá khu vực:</span>{locations.map(location => <button key={location} type="button" onClick={() => onLocationSelect?.(location)} className="rounded-full bg-surface-container-low px-4 py-2 text-on-surface hover:bg-surface-container">{location}</button>)}</div></section>;
};
export default QuickFilters;
