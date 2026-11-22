import React, { useState, useEffect } from 'react';
import { defaultSelection, DiscoverySelection } from '../../../services/discoveryApi';
import { StayDateRangeField } from './StayDateRangeField';
import { useLanguage } from '../../../i18n/LanguageContext';
interface SearchCardProps { initialSelection?: DiscoverySelection; onSearch?: (selection: DiscoverySelection) => void }
export const SearchCard: React.FC<SearchCardProps> = ({ onSearch, initialSelection }) => {
  const { t } = useLanguage();
  const [selection, setSelection] = useState(initialSelection || defaultSelection);
  useEffect(() => { if (initialSelection) setSelection(initialSelection); }, [initialSelection]);
  const field = 'mt-1 h-12 w-full rounded-full border border-outline-variant bg-surface-container-low px-4';
  return <section className="relative z-20 mx-auto -mt-12 w-full max-w-[1440px] px-5"><form onSubmit={e => { e.preventDefault(); onSearch?.({ ...selection, location: '', dates: `${selection.checkIn} – ${selection.checkOut}`, guests: t('search.guestsSummary', { guests: selection.adults + selection.children, rooms: selection.rooms }) }); }} className="grid gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-lg sm:grid-cols-2 lg:grid-cols-7">
    <div className="lg:col-span-2"><StayDateRangeField checkIn={selection.checkIn} checkOut={selection.checkOut} onChange={(checkIn, checkOut) => setSelection({ ...selection, location: '', checkIn, checkOut })} /></div>
    <div className="grid grid-cols-3 gap-2 lg:col-span-3">{([['adults', 'search.adults', 1, 100], ['children', 'search.children', 0, 100], ['rooms', 'search.rooms', 1, 20]] as const).map(([key, label, min, max]) => <label key={key}>{t(label)}<input type="number" required min={min} max={max} className={field} value={selection[key]} onChange={e => setSelection({ ...selection, [key]: Number(e.target.value) })} /></label>)}</div>
    <button className="self-end rounded-full bg-primary px-5 py-3 font-semibold text-on-primary lg:col-span-2">{t('search.submit')}</button>
  </form></section>;
};
export default SearchCard;
