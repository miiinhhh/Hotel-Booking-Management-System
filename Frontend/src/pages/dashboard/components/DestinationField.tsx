import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { discoveryApi } from '../../../services/discoveryApi';
import { useLanguage } from '../../../i18n/LanguageContext';

interface DestinationFieldProps {
  value: string;
  onChange: (value: string) => void;
}

type Suggestion = { kind: 'city'; label: string; count: number } | { kind: 'hotel'; label: string; detail: string };
type Destinations = { cities: { city: string; hotelCount: number }[]; hotels: { hotelId: number; name: string; city: string; address: string }[] };

/** Bỏ dấu tiếng Việt để so khớp: "da nang" khớp "Đà Nẵng". */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// Tải một lần cho cả phiên (dữ liệu nhỏ, ít thay đổi).
let cache: Promise<Destinations> | null = null;
const loadDestinations = () => (cache ??= discoveryApi.destinations().catch((e) => { cache = null; throw e; }));

/** Tô đậm đoạn khớp với từ khóa (so khớp không dấu). */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = fold(query.trim());
  const i = q ? fold(text).indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<strong className="font-semibold text-on-surface">{text.slice(i, i + q.length)}</strong>{text.slice(i + q.length)}</>;
};

/**
 * Ô "Điểm đến hoặc tên khách sạn" có gợi ý khi gõ (combobox).
 * Gõ tự do vẫn tìm được: backend tìm trong thành phố, địa chỉ và tên khách sạn.
 */
export const DestinationField: React.FC<DestinationFieldProps> = ({ value, onChange }) => {
  const { t } = useLanguage();
  const listId = useId();
  const [data, setData] = useState<Destinations | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { let alive = true; loadDestinations().then(d => { if (alive) setData(d); }).catch(() => {}); return () => { alive = false; }; }, []);

  // Đóng khi bấm ra ngoài.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!data) return [];
    const q = fold(value.trim());
    // Chỉ một thành phố (VD chỉ hoạt động ở Đà Nẵng) → không cần gợi ý theo thành phố.
    const cities = data.cities.length <= 1 ? [] : data.cities.filter(c => !q || fold(c.city).includes(q)).slice(0, 5)
      .map<Suggestion>(c => ({ kind: 'city', label: c.city, count: c.hotelCount }));
    // Khớp theo tên khách sạn và địa chỉ (khu vực, tên đường); chưa gõ thì hiện sẵn danh sách.
    const hotels = data.hotels.filter(h => !q || fold(`${h.name} ${h.address} ${h.city}`).includes(q)).slice(0, 8)
      .map<Suggestion>(h => ({ kind: 'hotel', label: h.name, detail: [h.address, h.city].filter(Boolean).join(', ') }));
    return [...cities, ...hotels];
  }, [data, value]);

  useEffect(() => setActive(-1), [value]);

  const choose = (s: Suggestion) => { onChange(s.label); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(suggestions.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(-1, i - 1)); }
    else if (e.key === 'Enter' && open && active >= 0 && suggestions[active]) { e.preventDefault(); choose(suggestions[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const cityItems = suggestions.filter(s => s.kind === 'city');
  const hotelItems = suggestions.filter(s => s.kind === 'hotel');
  const optionClass = (i: number) => `flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-surface-container' : 'hover:bg-surface-container-low'}`;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={`${listId}-input`} className="block">{t('search.destination')}</label>
      <div className="relative mt-1">
        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-primary">location_on</span>
        <input id={`${listId}-input`} type="text" autoComplete="off" value={value} placeholder={t('search.destinationPh')}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          className="h-12 w-full rounded-full border border-outline-variant bg-surface-container-low pl-11 pr-10 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
        {value && (
          <button type="button" aria-label={t('search.clearDestination')} onClick={() => { onChange(''); setOpen(true); }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-outline hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {open && data && (
        <div id={listId} role="listbox" className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-outline-variant/40 bg-surface-container-lowest py-2 shadow-xl">
          {suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-on-surface-variant">{t('search.noSuggestion')}</p>
          ) : (
            <>
              {cityItems.length > 0 && <p className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-outline">{t('search.suggestCities')}</p>}
              {cityItems.map(s => {
                const i = suggestions.indexOf(s);
                return (
                  <div key={`c-${s.label}`} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active}
                    onMouseDown={e => e.preventDefault()} onClick={() => choose(s)} onMouseEnter={() => setActive(i)} className={optionClass(i)}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary"><span className="material-symbols-outlined text-[18px]">location_city</span></span>
                    <span className="min-w-0 flex-1 text-on-surface-variant"><Highlight text={s.label} query={value} /></span>
                    {s.kind === 'city' && <span className="shrink-0 text-xs text-outline">{t('search.hotelCount', { count: s.count })}</span>}
                  </div>
                );
              })}
              {hotelItems.length > 0 && cityItems.length > 0 && <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-outline">{t('search.suggestHotels')}</p>}
              {hotelItems.map(s => {
                const i = suggestions.indexOf(s);
                return (
                  <div key={`h-${s.label}`} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active}
                    onMouseDown={e => e.preventDefault()} onClick={() => choose(s)} onMouseEnter={() => setActive(i)} className={optionClass(i)}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary"><span className="material-symbols-outlined text-[18px]">hotel</span></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-on-surface-variant"><Highlight text={s.label} query={value} /></span>
                      {s.kind === 'hotel' && <span className="block truncate text-xs text-outline"><Highlight text={s.detail} query={value} /></span>}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
export default DestinationField;
