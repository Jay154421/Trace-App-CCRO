import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import provinceGeoRows from '../../utils/provinces_list.json';

function buildPhCityRecords(rows) {
  const byCode = new Map();
  for (const row of rows) {
    const city = String(row?.city ?? '').trim().toUpperCase();
    const province = String(row?.province ?? '').trim().toUpperCase();
    const country = String(row?.country ?? '').trim().toUpperCase();
    const code = String(row?.code ?? '').trim().toUpperCase();
    if (!city || !province) continue;
    if (byCode.has(code)) continue;
    byCode.set(code, { city, province, country, code });
  }
  return [...byCode.values()];
}

const PH_CITY_RECORDS = buildPhCityRecords(provinceGeoRows);

function getCitySuggestions(query, maxRows = 40) {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const scored = [];
  for (const r of PH_CITY_RECORDS) {
    if (!r.city.includes(q)) continue;
    scored.push({ r, pri: r.city.startsWith(q) ? 0 : 1 });
  }
  scored.sort(
    (a, b) =>
      a.pri - b.pri ||
      a.r.city.localeCompare(b.r.city) ||
      a.r.province.localeCompare(b.r.province) ||
      a.r.code.localeCompare(b.r.code),
  );
  const out = [];
  for (const { r } of scored) {
    out.push({
      key: r.code,
      label: `${r.city}, ${r.province}`,
      record: r,
    });
    if (out.length >= maxRows) break;
  }
  return out;
}

const inputClassName =
  'mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200';

export default function PhCityAutocomplete({
  cityValue = '',
  onCityChange,
  onProvinceChange,
  placeholder = 'Enter City',
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef(null);

  const trimmedCity = String(cityValue ?? '').trim();

  const suggestions = useMemo(
    () => getCitySuggestions(trimmedCity),
    [trimmedCity],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedCity]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const applyItem = useCallback(
    (item) => {
      if (!item) return;
      const { record } = item;
      onCityChange(record.city);
      if (onProvinceChange) onProvinceChange(record.province);
      setOpen(false);
    },
    [onCityChange, onProvinceChange],
  );

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={cityValue}
        required={required}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-required={required}
        aria-controls={showList ? 'city-autocomplete-listbox' : undefined}
        aria-activedescendant={
          showList ? `city-autocomplete-opt-${activeIndex}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          onCityChange(v);
          if (!v.trim() && onProvinceChange) onProvinceChange('');
          setOpen(true);
        }}
        onFocus={() => {
          if (trimmedCity) {
            const sug = getCitySuggestions(trimmedCity);
            if (sug.length) setOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (
            (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
            suggestions.length
          ) {
            setOpen(true);
          }
          if (!showList) return;
          if (e.key === 'Escape') {
            setOpen(false);
            e.preventDefault();
          } else if (e.key === 'ArrowDown') {
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            e.preventDefault();
          } else if (e.key === 'ArrowUp') {
            setActiveIndex((i) => Math.max(i - 1, 0));
            e.preventDefault();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            applyItem(suggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        className={inputClassName}
      />
      {showList && (
        <ul
          id="city-autocomplete-listbox"
          role="listbox"
          className="absolute left-0 top-full z-[100] mt-0.5 max-h-56 min-w-full w-max max-w-[min(100vw-1rem,36rem)] overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.key}
              id={`city-autocomplete-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`cursor-pointer px-3 py-2 text-sm text-slate-800 ${
                idx === activeIndex ? 'bg-emerald-200' : 'hover:bg-emerald-100'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(ev) => {
                ev.preventDefault();
                applyItem(item);
              }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}