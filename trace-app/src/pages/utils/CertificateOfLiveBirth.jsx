import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../../services/api';

const DEFAULT_PROVINCE = 'Lanao Del Norte';
const DEFAULT_CITY_MUNICIPALITY = 'Iligan City';
const DEFAULT_COUNTRY_CODE = 'PH';
const DEFAULT_COUNTRY_TEXT = 'PHILIPPINES';
const DEFAULT_CERTIFICATION_PURPOSE = 'ANY LEGAL';

const DEFAULT_CERT = {
  registryNo: '',
  province: DEFAULT_PROVINCE,
  cityMunicipality: DEFAULT_CITY_MUNICIPALITY,
  childFirst: '',
  childMiddle: '',
  childLast: '',
  sex: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  placeOfBirthName: '',
  placeOfBirthCity: '',
  placeOfBirthProvince: '',
  typeOfBirth: '',
  multipleBirthOrder: '',
  birthOrder: '',
  weightGrams: '',
  motherFirst: '',
  motherMiddle: '',
  motherLast: '',
  motherCitizenship: '',
  motherReligion: '',
  motherChildrenBornAlive: '',
  motherChildrenLiving: '',
  motherChildrenDead: '',
  motherOccupation: '',
  motherAge: '',
  motherResidenceLine1: '',
  motherResidenceCity: '',
  motherResidenceProvince: '',
  motherResidenceCountry: DEFAULT_COUNTRY_CODE,
  fatherFirst: '',
  fatherMiddle: '',
  fatherLast: '',
  fatherCitizenship: '',
  fatherReligion: '',
  fatherOccupation: '',
  fatherAge: '',
  fatherResidenceLine1: '',
  fatherResidenceCity: '',
  fatherResidenceProvince: '',
  fatherResidenceCountry: DEFAULT_COUNTRY_CODE,
  marriageMonth: '',
  marriageDay: '',
  marriageYear: '',
  marriagePlaceCity: '',
  marriagePlaceProvince: '',
  marriagePlaceCountry: DEFAULT_COUNTRY_TEXT,
  attendantType: '',
  attendantOthersSpecify: '',
  attendantTime: '',
  attendantAmpm: 'AM',
  attendantName: '',
  attendantAddress: '',
  attendantTitle: '',
  attendantDate: '',
  informantName: '',
  informantAddress: '',
  informantRelationship: '',
  informantDate: '',
  preparedByName: '',
  preparedByTitle: '',
  preparedByDate: '',
  receivedByName: '',
  receivedByTitle: '',
  receivedByDate: '',
  registeredByName: '',
  registeredByTitle: '',
  registeredByDate: '',
  remarks: '',
  certificationPurpose: DEFAULT_CERTIFICATION_PURPOSE,
};

const AUTO_SAVE_MS = 700;

const RECEIVED_BY_OPTIONS = [
  { name: 'ATTY. YUSSIF DON JUSTIN F. MARTIL', title: 'CITY CIVIL REGISTRAR' },
  { name: 'LORELIE L. CANTO', title: 'REGISTRATION OFFICER IV' },
  { name: 'PHOEBE L. BENIGA', title: 'REGISTRATION OFFICER II' },
  { name: 'JAN FLAURENCE A. OBLENDA', title: 'REGISTRATION OFFICER II' },
];

const FALLBACK_COUNTRY_OPTIONS = [
  { code: 'PH', name: 'Philippines' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
];

const ATTENDANT_HOUR_OPTIONS = Array.from({ length: 12 }, (_, hourIdx) =>
  String(hourIdx + 1).padStart(2, '0'),
);
const ATTENDANT_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minuteIdx) =>
  String(minuteIdx).padStart(2, '0'),
);

function buildIso3166CountryOptions() {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    const list = [];
    for (let i = 0; i < 26; i += 1) {
      for (let j = 0; j < 26; j += 1) {
        const code = String.fromCharCode(65 + i, 65 + j);
        const name = dn.of(code);
        if (!name || name === code) continue;
        list.push({ code, name });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [...FALLBACK_COUNTRY_OPTIONS].sort((a, b) => a.name.localeCompare(b.name));
  }
}

const COUNTRY_OPTIONS = buildIso3166CountryOptions();
const COUNTRY_CODE_SET = new Set(COUNTRY_OPTIONS.map((c) => c.code));

/** Normalize loaded value to ISO alpha-2 when possible; keep unknown text for legacy rows. */
function normalizeStoredCountry(value) {
  if (!value || typeof value !== 'string') return '';
  const t = value.trim();
  if (t.length === 2 && COUNTRY_CODE_SET.has(t.toUpperCase())) return t.toUpperCase();
  const hit = COUNTRY_OPTIONS.find((o) => o.name.toLowerCase() === t.toLowerCase());
  if (hit) return hit.code;
  return t;
}

/** Full country name for PDF / printed field (from ISO code or legacy text). */
function countryCodeToDisplayName(value) {
  if (!value || typeof value !== 'string') return '';
  const t = value.trim();
  if (t.length === 2 && COUNTRY_CODE_SET.has(t.toUpperCase())) {
    const code = t.toUpperCase();
    const hit = COUNTRY_OPTIONS.find((o) => o.code === code);
    if (hit) return hit.name;
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      const n = dn.of(code);
      if (n && n !== code) return n;
    } catch (_) {}
    return code;
  }
  return t;
}

function sanitizePurpose(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

const SECTION_IDS = ['header', 'child', 'mother', 'father', 'marriage', 'attendant', 'signatures'];
const SECTION_LABELS = ['Header', 'Child', 'Mother', 'Father', 'Marriage', 'Attendant', 'Signatures'];

function parseDateOfBirth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { day: '', month: '', year: '' };
  const trimmed = dateStr.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (iso) {
    return { day: iso[3], month: iso[2], year: iso[1] };
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return { day: '', month: '', year: '' };
  return {
    day: String(d.getDate()),
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
  };
}

function trimStr(value) {
  if (value == null || typeof value !== 'string') return '';
  return value.trim();
}

function normalizeSexSelectValue(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim().toLowerCase();
  if (s === 'male' || s === 'm') return 'MALE';
  if (s === 'female' || s === 'f') return 'FEMALE';
  return String(value).trim().toUpperCase();
}

function normalizeAttendantAmpmValue(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'pm' || s === 'p.m.' || s === 'p.m') return 'PM';
  return 'AM';
}

/** YYYY-MM-DD for the applicant row when certificate day/month/year are all set. */
function certBirthPartsToIsoDate(yearStr, monthStr, dayStr) {
  const y = trimStr(yearStr);
  const m = trimStr(monthStr);
  const d = trimStr(dayStr);
  if (!y || !m || !d) return '';
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (!Number.isInteger(yi) || yi < 1000 || yi > 9999) return '';
  if (!Number.isInteger(mi) || mi < 1 || mi > 12) return '';
  if (!Number.isInteger(di) || di < 1 || di > 31) return '';
  return `${yi}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
}

function normalizeChildDobForCompare(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, 10);
}

/**
 * Parse applicant `place_of_birth` when certificate JSON does not hold split fields.
 * `formatPlaceOfBirthForApplicant` joins [name, city, province] with ", " (skipping blanks).
 */
function parsePlaceOfBirth(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { name: '', city: '', province: '' };

  const segments = text.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return { name: '', city: '', province: '' };
  if (segments.length === 1) return { name: segments[0], city: '', province: '' };
  // Two segments: ambiguous (institution+city vs city+province); keep legacy single-field behavior.
  if (segments.length === 2) return { name: text, city: '', province: '' };
  if (segments.length === 3) {
    return { name: segments[0], city: segments[1], province: segments[2] };
  }
  const province = segments.pop();
  const city = segments.pop();
  const name = segments.join(', ');
  return { name, city, province };
}

function formatPlaceOfBirthForApplicant(form) {
  const parts = [form.placeOfBirthName, form.placeOfBirthCity, form.placeOfBirthProvince]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  return parts.join(', ');
}

// Pixel-perfect colors from Certificate of Live Birth (Municipal Form No. 102)
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  accentGreen: '#00CC00',           // Vibrant green lines/borders (top sections)
  inputBgBeige: '#FFF8DC',         // Cornsilk - input fields (top)
  sectionStripe: '#F0F8E8',       // Pale yellowish-green - section headers & inputs (lower)
  borderGray: '#AAAAAA',           // Medium dark gray - borders (lower sections)
  accentLightGreen: '#D4EFD4',     // Underline MARRIAGE OF PARENTS, bottom boxes
  placeholderGray: '#A9A9A9',
  iconGray: '#666666',
};

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <rect x="1" y="2" width="14" height="13" rx="0" stroke={COLORS.iconGray} strokeWidth="1.2" fill="none" />
      <line x1="1" y1="5" x2="15" y2="5" stroke={COLORS.iconGray} strokeWidth="1.2" />
      <line x1="5" y1="1" x2="5" y2="4" stroke={COLORS.iconGray} strokeWidth="1.2" />
      <line x1="11" y1="1" x2="11" y2="4" stroke={COLORS.iconGray} strokeWidth="1.2" />
    </svg>
  );
}

const CALENDAR_WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const CALENDAR_MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Valid calendar date from separate fields, or null. */
function dateFromOptionalParts(yearStr, monthStr, dayStr) {
  const y = trimStr(yearStr);
  const m = trimStr(monthStr);
  const d = trimStr(dayStr);
  if (!y || !m || !d) return null;
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (!Number.isInteger(yi) || yi < 1000 || yi > 9999) return null;
  if (!Number.isInteger(mi) || mi < 1 || mi > 12) return null;
  if (!Number.isInteger(di) || di < 1 || di > 31) return null;
  const dt = new Date(yi, mi - 1, di);
  if (dt.getFullYear() !== yi || dt.getMonth() !== mi - 1 || dt.getDate() !== di) return null;
  return dt;
}

/** Parse ISO prefix or Date-parsable text for calendar seed / single-line date fields. */
function parseFlexibleDateSeed(text) {
  const t = trimStr(text);
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (iso) {
    const yi = Number(iso[1]);
    const mi = Number(iso[2]);
    const di = Number(iso[3]);
    if (!Number.isInteger(yi) || !Number.isInteger(mi) || !Number.isInteger(di)) return null;
    const dt = new Date(yi, mi - 1, di);
    if (dt.getFullYear() === yi && dt.getMonth() === mi - 1 && dt.getDate() === di) return dt;
  }
  const parsed = new Date(t);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function sameCalendarDate(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatIsoDateLocal(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildMonthCells(viewYear, viewMonthIndex) {
  const firstDow = new Date(viewYear, viewMonthIndex, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  return cells;
}

/**
 * Opens a month grid popover; calls onPick with the chosen Date then closes.
 * Use seedParts for day/month/year fields, or seedText for a single string field.
 */
function CertificateDatePicker({
  pickerId,
  openPickerId,
  setOpenPickerId,
  seedParts,
  seedText = '',
  onPick,
  ariaLabel,
}) {
  const wrapRef = useRef(null);
  const open = openPickerId === pickerId;
  const sy = seedParts?.year ?? '';
  const sm = seedParts?.month ?? '';
  const sd = seedParts?.day ?? '';

  const selected = useMemo(
    () => dateFromOptionalParts(sy, sm, sd) || parseFlexibleDateSeed(seedText),
    [sy, sm, sd, seedText],
  );

  const [cursorY, setCursorY] = useState(() => new Date().getFullYear());
  const [cursorM, setCursorM] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (!open) return;
    const base = dateFromOptionalParts(sy, sm, sd) || parseFlexibleDateSeed(seedText) || new Date();
    setCursorY(base.getFullYear());
    setCursorM(base.getMonth());
  }, [open, sy, sm, sd, seedText]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpenPickerId(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenPickerId(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpenPickerId]);

  const cells = useMemo(() => buildMonthCells(cursorY, cursorM), [cursorY, cursorM]);

  const goPrevMonth = () => {
    if (cursorM === 0) {
      setCursorM(11);
      setCursorY((y) => y - 1);
    } else {
      setCursorM((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (cursorM === 11) {
      setCursorM(0);
      setCursorY((y) => y + 1);
    } else {
      setCursorM((m) => m + 1);
    }
  };

  const handlePickDay = (day) => {
    onPick(new Date(cursorY, cursorM, day));
    setOpenPickerId(null);
  };

  return (
    <div className="relative inline-flex flex-shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-0.5 bg-transparent hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpenPickerId(open ? null : pickerId)}
      >
        <CalendarIcon />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-[100] mt-1 w-[min(100vw-1rem,280px)] rounded-md border border-slate-200 bg-white p-2 shadow-lg"
          role="dialog"
          aria-label={ariaLabel}
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Previous month"
              onClick={goPrevMonth}
            >
              ‹
            </button>
            <span className="text-center text-sm font-semibold text-slate-800">
              {CALENDAR_MONTH_LABELS[cursorM]} {cursorY}
            </span>
            <button
              type="button"
              className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Next month"
              onClick={goNextMonth}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-slate-500">
            {CALENDAR_WEEKDAY_LABELS.map((w) => (
              <div key={w} className="py-1 font-medium">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (day == null) {
                return <div key={`e-${cursorY}-${cursorM}-${idx}`} className="aspect-square" />;
              }
              const cellDate = new Date(cursorY, cursorM, day);
              const isSelected = sameCalendarDate(selected, cellDate);
              return (
                <button
                  key={day}
                  type="button"
                  className={`aspect-square rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isSelected ? 'bg-emerald-600 font-semibold text-white' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                  onClick={() => handlePickDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FormCountrySelect({ value = '', onChange, className = '', width }) {
  const t = typeof value === 'string' ? value.trim() : '';
  const isCode = t.length === 2 && COUNTRY_CODE_SET.has(t.toUpperCase());
  const selectValue = isCode ? t.toUpperCase() : t;
  const showLegacyOption = t.length > 0 && !isCode;

  return (
    <select
      aria-label="Country"
      value={selectValue}
      onChange={(e) => onChange(e.target.value)}
      className={`focus:outline-none focus:ring-0 min-h-[1.25rem] cursor-pointer appearance-none bg-no-repeat bg-[length:12px] bg-[right_4px_center] ${width || 'flex-1 min-w-0'} ${className}`}
      style={{
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        backgroundColor: COLORS.white,
        border: 'none',
        borderBottom: `1px solid ${COLORS.accentGreen}`,
        borderRadius: 0,
        padding: '2px 22px 2px 4px',
        color: COLORS.black,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23666' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
      }}
    >
      <option value="">(Country)</option>
      {showLegacyOption && (
        <option value={t}>{t} (update)</option>
      )}
      {COUNTRY_OPTIONS.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}

function FormLine({ value = '', onChange, placeholder, className = '', width, readOnly, useLowerStyle = false }) {
  const borderColor = useLowerStyle ? COLORS.borderGray : COLORS.accentGreen;
  return (
    <input
      type="text"
      value={value}
      onChange={readOnly ? undefined : (e) => onChange(e.target.value.toUpperCase())}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`focus:outline-none focus:ring-0 min-h-[1.25rem] ${width || 'flex-1 min-w-0'} ${className}`}
      style={{
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        backgroundColor: COLORS.white,
        border: useLowerStyle ? `1px solid ${COLORS.borderGray}` : 'none',
        borderBottom: useLowerStyle ? undefined : `1px solid ${borderColor}`,
        borderRadius: 0,
        padding: '2px 4px',
        color: COLORS.black,
      }}
    />
  );
}

function SectionStripe({ title, caption, children }) {
  return (
    <div style={{ border: `1px solid ${COLORS.borderGray}`, marginBottom: 0, borderRadius: 0 }}>
      <div style={{ backgroundColor: COLORS.sectionStripe, padding: '6px 8px', borderBottom: `1px solid ${COLORS.borderGray}` }}>
        <span style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: '15px', color: COLORS.black }}>{title}</span>
        {caption && <span style={{ fontFamily: FONT_FAMILY, fontSize: '15px', color: COLORS.black, marginLeft: '6px' }}>{caption}</span>}
      </div>
      <div style={{ padding: '8px', backgroundColor: COLORS.white }}>{children}</div>
    </div>
  );
}

function GreenRule() {
  return <hr className="border-0 my-2" style={{ height: 2, backgroundColor: COLORS.accentGreen }} />;
}

function SectionPanel({ title, children }) {
  return (
    <>
      <GreenRule />
      <section
        className="rounded-none border-b-2 pb-3"
        style={{ borderColor: COLORS.accentGreen, fontFamily: FONT_FAMILY, color: COLORS.black }}
      >
        <h2
          className="mb-4 border-b pb-2 text-lg font-bold uppercase"
          style={{ borderColor: COLORS.accentGreen, fontSize: '18px' }}
        >
          {title}
        </h2>
        {children}
      </section>
    </>
  );
}

export function CertificateOfLiveBirth() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [child, setChild] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_CERT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const certContentRef = useRef(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [openPickerId, setOpenPickerId] = useState(null);

  useEffect(() => {
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const cert = data.certificate_of_live_birth && typeof data.certificate_of_live_birth === 'object'
          ? data.certificate_of_live_birth
          : {};
        const base = { ...DEFAULT_CERT, ...cert };
        // Prefer split place-of-birth from saved certificate (camelCase or snake_case).
        base.placeOfBirthName = trimStr(base.placeOfBirthName) || trimStr(base.place_of_birth_name);
        base.placeOfBirthCity = trimStr(base.placeOfBirthCity) || trimStr(base.place_of_birth_city);
        base.placeOfBirthProvince = trimStr(base.placeOfBirthProvince) || trimStr(base.place_of_birth_province);
        base.motherResidenceCountry = normalizeStoredCountry(base.motherResidenceCountry);
        base.fatherResidenceCountry = normalizeStoredCountry(base.fatherResidenceCountry);
        if (!String(base.motherResidenceCountry || '').trim()) {
          base.motherResidenceCountry = DEFAULT_COUNTRY_CODE;
        }
        if (!String(base.fatherResidenceCountry || '').trim()) {
          base.fatherResidenceCountry = DEFAULT_COUNTRY_CODE;
        }
        if (!String(base.marriagePlaceCountry || '').trim()) {
          base.marriagePlaceCountry = DEFAULT_COUNTRY_TEXT;
        }
        if (!String(base.motherCountry || '').trim()) {
          const motherCountryName = countryCodeToDisplayName(base.motherResidenceCountry);
          base.motherCountry = motherCountryName ? motherCountryName.toUpperCase() : DEFAULT_COUNTRY_TEXT;
        }
        if (!String(base.fatherCountry || '').trim()) {
          const fatherCountryName = countryCodeToDisplayName(base.fatherResidenceCountry);
          base.fatherCountry = fatherCountryName ? fatherCountryName.toUpperCase() : DEFAULT_COUNTRY_TEXT;
        }
        const loadedPurpose = sanitizePurpose(
          base.certificationPurpose ?? base.certification_purpose ?? base.purpose,
        );
        base.certificationPurpose = loadedPurpose || DEFAULT_CERTIFICATION_PURPOSE;
        base.sex = normalizeSexSelectValue(base.sex);
        base.attendantAmpm = normalizeAttendantAmpmValue(base.attendantAmpm);
        const fromChild = {
          province: base.province || DEFAULT_PROVINCE,
          cityMunicipality: base.cityMunicipality || DEFAULT_CITY_MUNICIPALITY,
          // Keep these synced with applicant edits.
          childFirst: String(data.first_name ?? '').toUpperCase(),
          childMiddle: String(data.middle_name ?? '').toUpperCase(),
          childLast: String(data.last_name ?? '').toUpperCase(),
        };
        const { day, month, year } = parseDateOfBirth(data.date_of_birth);
        fromChild.birthDay = day;
        fromChild.birthMonth = month;
        fromChild.birthYear = year;
        const certHasSplitPlace = Boolean(base.placeOfBirthCity || base.placeOfBirthProvince);
        if (certHasSplitPlace) {
          fromChild.placeOfBirthName = base.placeOfBirthName;
          fromChild.placeOfBirthCity = base.placeOfBirthCity;
          fromChild.placeOfBirthProvince = base.placeOfBirthProvince;
        } else {
          const parsedPlace = parsePlaceOfBirth(data.place_of_birth);
          fromChild.placeOfBirthName = parsedPlace.name;
          fromChild.placeOfBirthCity = parsedPlace.city;
          fromChild.placeOfBirthProvince = parsedPlace.province;
        }
        setForm({ ...base, ...fromChild });
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const defaultTitle = 'B-TRACE System';

  useEffect(() => {
    document.title = 'Certificate of Live Birth';
    return () => {
      document.title = defaultTitle;
    };
  }, []);

  useEffect(() => {
    const styleId = 'certificate-of-live-birth-print-size';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .certificate-of-live-birth-form input::placeholder,
      .certificate-of-live-birth-form textarea::placeholder { color: #A9A9A9; }
      .certificate-of-live-birth-form input:focus-visible,
      .certificate-of-live-birth-form textarea:focus-visible,
      .certificate-of-live-birth-form select:focus-visible { outline: 2px solid #00CC00; outline-offset: 2px; }
      .certificate-tabs-wrap { max-width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
      .certificate-tabs-nav { display: flex; gap: 0; border-bottom: 2px solid #e2e8f0; background: #f8fafc; padding: 0 0.5rem; min-height: 2.75rem; align-items: stretch; }
      .certificate-tab { flex-shrink: 0; padding: 0.5rem 1rem; font-size: 0.8125rem; font-weight: 500; color: #64748b; background: none; border: none; border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer; transition: color 0.15s, border-color 0.15s; font-family: inherit; }
      .certificate-tab:hover { color: #0f172a; }
      .certificate-tab.active { color: #059669; border-bottom-color: #059669; background: #fff; }
      .certificate-step-nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-top: 1px solid #e2e8f0; margin-top: 1rem; }
      .certificate-step-nav span { font-size: 0.8125rem; color: #64748b; }
      .certificate-tab-panel { display: none; }
      .certificate-tab-panel.active { display: block; }
      .certificate-card { border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: visible; background: #fff; padding: 1.25rem; margin-bottom: 0; }
      @media (min-width: 768px) {
        .certificate-card { padding: 1.5rem; }
      }
      @media print {
        @page { size: 8.5in 14in; margin: 0.25in; }
        aside[aria-label="Main navigation"] { display: none !important; }
        main[aria-label="Main content"] { flex: 1 1 100%; width: 100%; }
        body { height: 14in; overflow: hidden !important; }
        .certificate-section-nav { display: none !important; }
        .certificate-sticky-bar { display: none !important; }
        .certificate-tabs-wrap { display: none !important; }
        .certificate-step-nav { display: none !important; }
        .certificate-tab-panel { display: block !important; }
        .certificate-card { border-radius: 0 !important; box-shadow: none !important; border: none !important; margin-bottom: 0 !important; padding: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const save = useCallback(async () => {
    if (!id) return;
    const payload = { ...form };
    if (JSON.stringify(payload) === lastSavedRef.current) return;
    lastSavedRef.current = JSON.stringify(payload);
    setSaving(true);
    try {
      await childrenApi.updateCertificateOfLiveBirth(id, payload);
      const nextPlaceOfBirth = formatPlaceOfBirthForApplicant(payload);
      const currentPlaceOfBirth = typeof child?.place_of_birth === 'string' ? child.place_of_birth.trim() : '';

      const applicantPatch = {};
      if (nextPlaceOfBirth !== currentPlaceOfBirth) {
        applicantPatch.place_of_birth = nextPlaceOfBirth || null;
      }

      const nextFirst = trimStr(payload.childFirst);
      const nextMiddle = trimStr(payload.childMiddle);
      const nextLast = trimStr(payload.childLast);
      const dobIso = certBirthPartsToIsoDate(payload.birthYear, payload.birthMonth, payload.birthDay);
      const childDob = normalizeChildDobForCompare(child?.date_of_birth);

      if (nextFirst && nextFirst !== trimStr(child?.first_name)) applicantPatch.first_name = nextFirst;
      if (nextLast && nextLast !== trimStr(child?.last_name)) applicantPatch.last_name = nextLast;
      if (nextMiddle !== trimStr(child?.middle_name)) applicantPatch.middle_name = nextMiddle;
      if (dobIso && dobIso !== childDob) applicantPatch.date_of_birth = dobIso;

      if (Object.keys(applicantPatch).length > 0) {
        await childrenApi.update(id, applicantPatch);
        const refreshed = await childrenApi.get(id);
        setChild(refreshed);
      }
      toast.success('Saved');
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
      lastSavedRef.current = null;
    } finally {
      setSaving(false);
    }
  }, [id, form, child]);

  useEffect(() => {
    if (!id || loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(save, AUTO_SAVE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [form, id, loading, save]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  const totalSteps = SECTION_IDS.length;
  const canPrev = activeTabIndex > 0;
  const canNext = activeTabIndex < totalSteps - 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-2 pb-8 sm:px-4 print:max-w-none print:px-0 print:pb-0">
      <div className="certificate-sticky-bar sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:gap-4 sm:px-4 print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to applicant</Link>
        <span className="order-3 w-full truncate text-sm font-medium text-slate-700 sm:order-none sm:w-auto">
          {child.first_name} {child.last_name}
        </span>
        {saving && <span className="text-sm text-emerald-600">Saving…</span>}
      </div>

      <div className="certificate-tabs-wrap print:hidden">
        <nav className="certificate-tabs-nav" aria-label="Form sections">
          {SECTION_LABELS.map((label, i) => (
            <button
              key={SECTION_IDS[i]}
              type="button"
              onClick={() => setActiveTabIndex(i)}
              className={`certificate-tab ${activeTabIndex === i ? 'active' : ''}`}
              aria-current={activeTabIndex === i ? 'step' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div
        ref={certContentRef}
        className="certificate-of-live-birth-form mt-4 space-y-4"
        style={{
          fontFamily: FONT_FAMILY,
          width: '100%',
          maxWidth: '100%',
          fontSize: '15px',
          color: COLORS.black,
        }}
      >
          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 0 ? 'active' : ''}`} id="header">
            <header className="pb-3" style={{ borderBottom: `2px solid ${COLORS.accentGreen}` }}>
          <div className="text-center" style={{ marginTop: '8px' }}>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '15px', fontWeight: 400, color: COLORS.black, margin: 0 }}>Republic of the Philippines</p>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '16px', fontWeight: 400, color: COLORS.black, margin: '2px 0' }}>OFFICE OF THE CIVIL REGISTRAR GENERAL</p>
            <h1 className="text-center font-bold uppercase text-black mt-3 pb-2" style={{ fontFamily: FONT_FAMILY, fontSize: '20px', borderBottom: `2px solid ${COLORS.accentGreen}`, marginBottom: 0 }}>CERTIFICATE OF LIVE BIRTH</h1>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.accentGreen}`, paddingTop: '8px', fontFamily: FONT_FAMILY, fontSize: '16px', color: COLORS.black }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col min-w-0">
                <span className="mb-1">Province</span>
                <FormLine value={form.province} onChange={(v) => update('province', v)} placeholder="(Province)" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="mb-1">City/Municipality</span>
                <FormLine value={form.cityMunicipality} onChange={(v) => update('cityMunicipality', v)} placeholder="(City/Municipality)" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="mb-1">Registry No.</span>
                <FormLine value={form.registryNo} onChange={(v) => update('registryNo', v)} placeholder="(Registry No.)" className="w-full" width="w-full" />
              </div>
            </div>
          </div>
            </header>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 1 ? 'active' : ''}`} id="child">
        <SectionPanel title="Child">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">1. NAME</label>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.childFirst} onChange={(v) => update('childFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.childMiddle} onChange={(v) => update('childMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.childLast} onChange={(v) => update('childLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">2. SEX (Male/Female)</label>
              <select
                aria-label="Sex"
                value={form.sex}
                onChange={(e) => update('sex', e.target.value.toUpperCase())}
                className="focus:outline-none focus:ring-0 min-h-[1.25rem] cursor-pointer appearance-none bg-no-repeat bg-[length:12px] bg-[right_4px_center] w-28"
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: '16px',
                  backgroundColor: COLORS.white,
                  border: 'none',
                  borderBottom: `1px solid ${COLORS.accentGreen}`,
                  borderRadius: 0,
                  padding: '2px 22px 2px 4px',
                  color: COLORS.black,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23666' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                }}
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-normal">3. DATE OF BIRTH</label>
              <div className="flex flex-wrap gap-2 items-center">
                <FormLine value={form.birthDay} onChange={(v) => update('birthDay', v)} placeholder="(Day)" className="w-14" width="w-14" />
                <FormLine value={form.birthMonth} onChange={(v) => update('birthMonth', v)} placeholder="(Month)" className="w-20" width="w-20" />
                <FormLine value={form.birthYear} onChange={(v) => update('birthYear', v)} placeholder="(Year)" className="w-20" width="w-20" />
                <CertificateDatePicker
                  pickerId="birth"
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                  seedParts={{ year: form.birthYear, month: form.birthMonth, day: form.birthDay }}
                  onPick={(d) => {
                    setForm((p) => ({
                      ...p,
                      birthDay: String(d.getDate()),
                      birthMonth: String(d.getMonth() + 1),
                      birthYear: String(d.getFullYear()),
                    }));
                  }}
                  ariaLabel="Choose date of birth"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">4. PLACE OF BIRTH</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.placeOfBirthName} onChange={(v) => update('placeOfBirthName', v)} placeholder="(Name of Hospital/Clinic/Institution/House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormLine value={form.placeOfBirthCity} onChange={(v) => update('placeOfBirthCity', v)} placeholder="(City/Municipality)" />
                  <FormLine value={form.placeOfBirthProvince} onChange={(v) => update('placeOfBirthProvince', v)} placeholder="(Province)" />
                </div>
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">5a. TYPE OF BIRTH</label>
              <FormLine value={form.typeOfBirth} onChange={(v) => update('typeOfBirth', v)} placeholder="(Single, Twin, Triplet, etc.)" className="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">5b. IF MULTIPLE BIRTH, CHILD WAS</label>
              <FormLine value={form.multipleBirthOrder} onChange={(v) => update('multipleBirthOrder', v)} placeholder="(First, Second, Third, etc.)" className="w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">5c. BIRTH ORDER</label>
              <p className="mb-1 text-slate-600" style={{ fontSize: '14px' }}>(Order of this birth to previous live births including fetal death)</p>
              <FormLine value={form.birthOrder} onChange={(v) => update('birthOrder', v)} placeholder="(First, Second, Third, etc.)" className="w-full max-w-xs" />
            </div>
            <div>
              <label className="block mb-1 font-normal">6. WEIGHT AT BIRTH</label>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.weightGrams} onChange={(v) => update('weightGrams', v)} placeholder="(e.g. 3200)" className="w-24" width="w-24" />
                <span>grams</span>
              </div>
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 2 ? 'active' : ''}`} id="mother">
        <SectionPanel title="Mother">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">7. MAIDEN NAME</label>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.motherFirst} onChange={(v) => update('motherFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.motherMiddle} onChange={(v) => update('motherMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.motherLast} onChange={(v) => update('motherLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">8. CITIZENSHIP</label>
              <FormLine value={form.motherCitizenship} onChange={(v) => update('motherCitizenship', v)} placeholder="(Citizenship)" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">9. RELIGION/RELIGIOUS SECT</label>
              <FormLine value={form.motherReligion} onChange={(v) => update('motherReligion', v)} placeholder="(Religion/Religious sect)" className="w-full" width="w-full" />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 font-normal">10a. Total number of children born alive</label>
                <FormLine value={form.motherChildrenBornAlive} onChange={(v) => update('motherChildrenBornAlive', v)} placeholder="(Number)" className="w-full" width="w-full" />
              </div>
              <div>
                <label className="block mb-1 font-normal">10b. No. of children still living including this birth</label>
                <FormLine value={form.motherChildrenLiving} onChange={(v) => update('motherChildrenLiving', v)} placeholder="(Number)" className="w-full" width="w-full" />
              </div>
              <div>
                <label className="block mb-1 font-normal">10c. No. of children born alive but are now dead</label>
                <FormLine value={form.motherChildrenDead} onChange={(v) => update('motherChildrenDead', v)} placeholder="(Number)" className="w-full" width="w-full" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">11. OCCUPATION</label>
              <FormLine value={form.motherOccupation} onChange={(v) => update('motherOccupation', v)} placeholder="(Occupation)" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">12. AGE at the time of this birth (completed years)</label>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.motherAge} onChange={(v) => update('motherAge', v)} placeholder="(Age)" className="w-20" width="w-20" />
                <span style={{ fontSize: '14px' }}>#</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">13. RESIDENCE</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.motherResidenceLine1} onChange={(v) => update('motherResidenceLine1', v)} placeholder="(House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormLine value={form.motherResidenceCity} onChange={(v) => update('motherResidenceCity', v)} placeholder="(City/Municipality)" className="w-full" width="w-full" />
                  <FormLine value={form.motherResidenceProvince} onChange={(v) => update('motherResidenceProvince', v)} placeholder="(Province)" className="w-full" width="w-full" />
                  <FormCountrySelect
                    value={form.motherResidenceCountry}
                    onChange={(v) => {
                      const n = normalizeStoredCountry(v);
                      setForm((p) => ({
                        ...p,
                        motherResidenceCountry: n,
                        motherCountry: countryCodeToDisplayName(n) || '',
                      }));
                    }}
                    className="w-full"
                    width="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 3 ? 'active' : ''}`} id="father">
        <SectionPanel title="Father">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">14. NAME</label>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.fatherFirst} onChange={(v) => update('fatherFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.fatherMiddle} onChange={(v) => update('fatherMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.fatherLast} onChange={(v) => update('fatherLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">15. CITIZENSHIP</label>
              <FormLine value={form.fatherCitizenship} onChange={(v) => update('fatherCitizenship', v)} placeholder="(Citizenship)" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">16. RELIGION/RELIGIOUS SECT</label>
              <FormLine value={form.fatherReligion} onChange={(v) => update('fatherReligion', v)} placeholder="(Religion/Religious sect)" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">17. OCCUPATION</label>
              <FormLine value={form.fatherOccupation} onChange={(v) => update('fatherOccupation', v)} placeholder="(Occupation)" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">18. AGE at the time of this birth (completed years)</label>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.fatherAge} onChange={(v) => update('fatherAge', v)} placeholder="(Age)" className="w-20" width="w-20" />
                <span style={{ fontSize: '14px' }}>#</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">19. RESIDENCE</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.fatherResidenceLine1} onChange={(v) => update('fatherResidenceLine1', v)} placeholder="(House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormLine value={form.fatherResidenceCity} onChange={(v) => update('fatherResidenceCity', v)} placeholder="(City/Municipality)" className="w-full" width="w-full" />
                  <FormLine value={form.fatherResidenceProvince} onChange={(v) => update('fatherResidenceProvince', v)} placeholder="(Province)" className="w-full" width="w-full" />
                  <FormCountrySelect
                    value={form.fatherResidenceCountry}
                    onChange={(v) => {
                      const n = normalizeStoredCountry(v);
                      setForm((p) => ({
                        ...p,
                        fatherResidenceCountry: n,
                        fatherCountry: countryCodeToDisplayName(n) || '',
                      }));
                    }}
                    className="w-full"
                    width="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 4 ? 'active' : ''}`} id="marriage">
        <SectionPanel title="Marriage of Parents">
          <p className="mb-4 text-sm text-slate-700">
            (If not married, accomplish Affidavit of Acknowledgement/Admission of Paternity at the back.)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div>
              <label className="block mb-1 font-normal">20a. DATE</label>
              <div className="flex flex-wrap items-center gap-2">
                <FormLine
                  value={form.marriageMonth}
                  onChange={(v) => update('marriageMonth', v)}
                  placeholder="(Month)"
                  className="w-28"
                  width="w-28"
                />
                <FormLine
                  value={form.marriageDay}
                  onChange={(v) => update('marriageDay', v)}
                  placeholder="(Day)"
                  className="w-14"
                  width="w-14"
                />
                <FormLine
                  value={form.marriageYear}
                  onChange={(v) => update('marriageYear', v)}
                  placeholder="(Year)"
                  className="w-20"
                  width="w-20"
                />
                <CertificateDatePicker
                  pickerId="marriage"
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                  seedParts={{ year: form.marriageYear, month: form.marriageMonth, day: form.marriageDay }}
                  onPick={(d) => {
                    setForm((p) => ({
                      ...p,
                      marriageMonth: String(d.getMonth() + 1),
                      marriageDay: String(d.getDate()),
                      marriageYear: String(d.getFullYear()),
                    }));
                  }}
                  ariaLabel="Choose parents marriage date"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">20b. PLACE</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FormLine
                  value={form.marriagePlaceCity}
                  onChange={(v) => update('marriagePlaceCity', v)}
                  placeholder="(City/Municipality)"
                  className="w-full"
                  width="w-full"
                />
                <FormLine
                  value={form.marriagePlaceProvince}
                  onChange={(v) => update('marriagePlaceProvince', v)}
                  placeholder="(Province)"
                  className="w-full"
                  width="w-full"
                />
                <FormLine
                  value={form.marriagePlaceCountry}
                  onChange={(v) => update('marriagePlaceCountry', v)}
                  placeholder="(Country)"
                  className="w-full"
                  width="w-full"
                />
              </div>
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 5 ? 'active' : ''}`} id="attendant">
        <SectionPanel title="Attendant">
          <div className="mb-4">
            <h3 className="mb-2 text-base font-bold">21a. ATTENDANT</h3>
            <div className="flex flex-wrap gap-4 items-center" style={{ fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.black }}>
            {[
              '1 Physician',
              '2 Nurse',
              '3 Midwife',
              '4 Hilot (Traditional Birth Attendant)',
              '5 Others (Specify)',
            ].map((label, i) => {
              const opt = ['Physician', 'Nurse', 'Midwife', 'Hilot (Traditional Birth Attendant)', 'Others'][i];
              return (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="attendantType"
                    checked={form.attendantType === opt}
                    onChange={() => update('attendantType', opt)}
                    className="sr-only"
                  />
                  <span
                    className="inline-block w-4 h-4 flex-shrink-0"
                    style={{ border: `1px solid ${COLORS.accentGreen}`, borderRadius: 0, backgroundColor: form.attendantType === opt ? COLORS.black : COLORS.white }}
                  />
                  <span>{label}</span>
                  {opt === 'Others' && (
                    <FormLine value={form.attendantOthersSpecify} onChange={(v) => update('attendantOthersSpecify', v)} placeholder="(Specify)" className="w-24 inline-block ml-0" width="w-24" />
                  )}
                </label>
              );
            })}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="mb-2 text-base font-bold">
              21b. CERTIFICATION OF ATTENDANT AT BIRTH
              <span className="block text-sm font-normal normal-case">
                (Physician, Nurse, Midwife, Traditional Birth Attendant/Hilot, etc.)
              </span>
            </h3>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.black, marginBottom: '8px' }}>
            I hereby certify that I attended the birth of the child who was born alive at
            <span className="inline-flex items-baseline gap-1 mx-1 align-middle">
              {(() => {
                const timeValue = String(form.attendantTime || '');
                const validTime = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '01:00';
                const [hourValue, minuteValue] = validTime.split(':');

                return (
                  <>
                    <select
                      value={hourValue}
                      onChange={(e) => update('attendantTime', `${e.target.value}:${minuteValue}`)}
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontSize: '14px',
                        backgroundColor: COLORS.white,
                        border: `1px solid ${COLORS.accentGreen}`,
                        borderRadius: 0,
                        padding: '2px 4px',
                        color: COLORS.black,
                      }}
                    >
                      {ATTENDANT_HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span>:</span>
                    <select
                      value={minuteValue}
                      onChange={(e) => update('attendantTime', `${hourValue}:${e.target.value}`)}
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontSize: '14px',
                        backgroundColor: COLORS.white,
                        border: `1px solid ${COLORS.accentGreen}`,
                        borderRadius: 0,
                        padding: '2px 4px',
                        color: COLORS.black,
                      }}
                    >
                      {ATTENDANT_MINUTE_OPTIONS.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </>
                );
              })()}
              <select value={form.attendantAmpm} onChange={(e) => update('attendantAmpm', e.target.value.toUpperCase())} style={{ fontFamily: FONT_FAMILY, fontSize: '14px', backgroundColor: COLORS.white, border: `1px solid ${COLORS.accentGreen}`, borderRadius: 0, padding: '2px 4px', color: COLORS.black }}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </span>
            on the date of birth specified above.
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4"
            style={{ fontSize: '14px' }}
          >
           
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Address</p>
              <FormLine value={form.attendantAddress} onChange={(v) => update('attendantAddress', v)} placeholder="(Address)" className="w-full" />
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
              <FormLine value={form.attendantName} onChange={(v) => update('attendantName', v)} placeholder="(Name in print)" />
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
              <div className="flex items-center gap-1">
                <FormLine value={form.attendantDate} onChange={(v) => update('attendantDate', v)} placeholder="(YYYY-MM-DD)" className="flex-1 min-w-0" />
                <CertificateDatePicker
                  pickerId="attendantDate"
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                  seedText={form.attendantDate}
                  onPick={(d) => {
                    setForm((p) => ({ ...p, attendantDate: formatIsoDateLocal(d) }));
                  }}
                  ariaLabel="Choose attendant signature date"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p>
              <FormLine value={form.attendantTitle} onChange={(v) => update('attendantTitle', v)} placeholder="(Title or position)" />
            </div>
          </div>
          </div>
        </SectionPanel>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 6 ? 'active' : ''}`} id="signatures">
        <SectionPanel title="Signatures">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <div>
            <h3 className="mb-2 text-base font-bold">22. CERTIFICATION OF INFORMANT</h3>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>I hereby certify that all information supplied are true and correct to my own knowledge and belief.</p>
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.informantName} onChange={(v) => update('informantName', v)} placeholder="(Name in print)" /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Relationship to the Child</p><FormLine value={form.informantRelationship} onChange={(v) => update('informantRelationship', v)} placeholder="(e.g. Mother, Father)" /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Address</p><textarea value={form.informantAddress} onChange={(e) => update('informantAddress', e.target.value.toUpperCase())} placeholder="(Complete address)" rows={2} className="w-full focus:outline-none" style={{ fontFamily: FONT_FAMILY, fontSize: '14px', backgroundColor: COLORS.white, border: `1px solid ${COLORS.borderGray}`, borderRadius: 0, padding: '4px' }} /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.informantDate} onChange={(v) => update('informantDate', v)} placeholder="(YYYY-MM-DD)" />
                  <CertificateDatePicker
                    pickerId="informantDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.informantDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, informantDate: formatIsoDateLocal(d) }));
                    }}
                    ariaLabel="Choose informant date"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-base font-bold">23. PREPARED BY</h3>
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.preparedByName} onChange={(v) => update('preparedByName', v)} placeholder="(Name in print)" /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.preparedByTitle} onChange={(v) => update('preparedByTitle', v)} placeholder="(Title or position)" /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.preparedByDate} onChange={(v) => update('preparedByDate', v)} placeholder="(YYYY-MM-DD)" />
                  <CertificateDatePicker
                    pickerId="preparedByDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.preparedByDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, preparedByDate: formatIsoDateLocal(d) }));
                    }}
                    ariaLabel="Choose prepared by date"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-base font-bold">24. RECEIVED BY</h3>
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
                <select
                  value={form.receivedByName}
                  onChange={(e) => {
                    const chosen = RECEIVED_BY_OPTIONS.find((o) => o.name === e.target.value);
                    update('receivedByName', e.target.value);
                    update('receivedByTitle', chosen ? chosen.title : '');
                  }}
                  className="w-full min-h-[1.25rem] focus:outline-none focus:ring-0"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: '16px',
                    backgroundColor: COLORS.white,
                    border: `1px solid ${COLORS.borderGray}`,
                    borderRadius: 0,
                    padding: '2px 4px',
                    color: COLORS.black,
                  }}
                >
                  <option value="">Select name...</option>
                  {RECEIVED_BY_OPTIONS.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.receivedByTitle} onChange={(v) => update('receivedByTitle', v)} placeholder="(Title or position)" /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.receivedByDate} onChange={(v) => update('receivedByDate', v)} placeholder="(YYYY-MM-DD)" />
                  <CertificateDatePicker
                    pickerId="receivedByDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.receivedByDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, receivedByDate: formatIsoDateLocal(d) }));
                    }}
                    ariaLabel="Choose received by date"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-base font-bold">25. REGISTERED BY THE CIVIL REGISTRAR</h3>
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
                <select
                  value={form.registeredByName}
                  onChange={(e) => {
                    const chosen = RECEIVED_BY_OPTIONS.find((o) => o.name === e.target.value);
                    update('registeredByName', e.target.value);
                    update('registeredByTitle', chosen ? chosen.title : '');
                  }}
                  className="w-full min-h-[1.25rem] focus:outline-none focus:ring-0"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: '16px',
                    backgroundColor: COLORS.white,
                    border: `1px solid ${COLORS.borderGray}`,
                    borderRadius: 0,
                    padding: '2px 4px',
                    color: COLORS.black,
                  }}
                >
                  <option value="">Select name...</option>
                  {RECEIVED_BY_OPTIONS.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.registeredByTitle} onChange={(v) => update('registeredByTitle', v)} placeholder="(Title or position)" /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.registeredByDate} onChange={(v) => update('registeredByDate', v)} placeholder="(YYYY-MM-DD)" />
                  <CertificateDatePicker
                    pickerId="registeredByDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.registeredByDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, registeredByDate: formatIsoDateLocal(d) }));
                    }}
                    ariaLabel="Choose registered by date"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </SectionPanel>
          </div>

        <div className="certificate-step-nav print:hidden">
          <button
            type="button"
            onClick={() => setActiveTabIndex((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-slate-500">
            Step {activeTabIndex + 1} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={() => setActiveTabIndex((i) => Math.min(totalSteps - 1, i + 1))}
            disabled={!canNext}
            className="rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600 print:hidden">Switch tabs or use Previous/Next. Changes save automatically.</p>
      </div>
    </div>
  );
}



