import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useRef, useCallback, useMemo, memo, useId } from 'react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../../services/api';
import regionReligionRows from '../../utils/region_list.json';
import occupationRows from '../../utils/occupations_list.json';
import provinceGeoRows from '../../utils/provinces_list.json';
import ccrCitizenshipRows from '../../utils/CCR_citizenships.json';

const DEFAULT_PROVINCE = 'LANAO DEL NORTE';
const DEFAULT_CITY_MUNICIPALITY = 'ILIGAN CITY';
const DEFAULT_CERTIFICATION_PURPOSE = 'ANY LEGAL';
const REGISTRAR_BOX_GROUPS = [
  { label: '8', key: 'registrarBox8', digits: 2 },
  { label: '9', key: 'registrarBox9', digits: 2 },
  { label: '11', key: 'registrarBox11', digits: 3 },
  { label: '13', key: 'registrarBox13', digits: 8 },
  { label: '15', key: 'registrarBox15', digits: 2 },
  { label: '16', key: 'registrarBox16', digits: 2 },
  { label: '17', key: 'registrarBox17', digits: 3 },
  { label: '19', key: 'registrarBox19', digits: 8 },
];

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
  motherResidenceCountry: '',
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
  fatherResidenceCountry: '',
  marriageMonth: '',
  marriageDay: '',
  marriageYear: '',
  marriagePlaceCity: '',
  marriagePlaceProvince: '',
  marriagePlaceCountry: '',
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
  registrarBox8: '',
  registrarBox9: '',
  registrarBox11: '',
  registrarBox13: '',
  registrarBox15: '',
  registrarBox16: '',
  registrarBox17: '',
  registrarBox19: '',
  certificationPurpose: DEFAULT_CERTIFICATION_PURPOSE,
};

const AUTO_SAVE_MS = 700;

/** Fields 10a–10c, 12, 18: digits only, max length 2. */
function normalizeTwoDigitNumericInput(raw) {
  const s = String(raw ?? '');
  const digitsOnly = s.replace(/\D/g, '');
  const hadNonDigit = /\D/.test(s);
  const exceededLength = digitsOnly.length > 2;
  const value = digitsOnly.slice(0, 2);
  return { value, hadNonDigit, exceededLength };
}

const RECEIVED_BY_OPTIONS = [
  { name: 'ATTY. YUSSIF DON JUSTIN F. MARTIL', title: 'CITY CIVIL REGISTRAR' },
  { name: 'LORELIE L. CANTO', title: 'REGISTRATION OFFICER IV' },
  { name: 'PHOEBE L. BENIGA', title: 'REGISTRATION OFFICER II' },
  { name: 'JAN FLAURENCE A. OBLENDA', title: 'REGISTRATION OFFICER II' },
];

const LCRO_STAFF_MEMBERS = [
  { name: 'ANGELINE T. PARAYDAY', title: 'LCRO STAFF' },
  { name: 'BUENA MAY G. MORALDE', title: 'LCRO STAFF' },
  { name: 'SHIRLEY L. DEMECILLO', title: 'LCRO STAFF' },
  { name: 'ULYNDA P. ZALSOS', title: 'LCRO STAFF' },
  { name: 'PHOEBE L. BENIGA', title: 'REGISTRATION OFFICER II' },
  { name: 'ATTY. YUSSIF DON JUSTIN F. MARTIL', title: 'CITY CIVIL REGISTRAR' },
];
const LCRO_STAFF_MEMBER_NAMES = LCRO_STAFF_MEMBERS.map((member) => member.name);


const FALLBACK_COUNTRY_OPTIONS = [
  { code: 'PH', name: 'PHILIPPINES' },
  { code: 'US', name: 'UNITED STATES' },
  { code: 'GB', name: 'UNITED KINGDOM' },
  { code: 'AU', name: 'AUSTRALIA' },
  { code: 'CA', name: 'CANADA' },
  { code: 'SA', name: 'SAUDI ARABIA' },
  { code: 'AE', name: 'UNITED ARAB EMIRATES' },
  { code: 'JP', name: 'JAPAN' },
  { code: 'SG', name: 'SINGAPORE' },
  { code: 'MY', name: 'MALAYSIA' },
];

const ATTENDANT_HOUR_OPTIONS = Array.from({ length: 12 }, (_, hourIdx) =>
  String(hourIdx + 1).padStart(2, '0'),
);
const ATTENDANT_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minuteIdx) =>
  String(minuteIdx).padStart(2, '0'),
);

/** Distinct PSA religion labels from `region_list.json` (datalist suggestions). */
function buildDistinctReligionLabels(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const r = String(row?.religion ?? '').trim();
    if (!r || seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

const RELIGION_AUTOCOMPLETE_OPTIONS = buildDistinctReligionLabels(regionReligionRows);

/** Distinct PSA occupation labels from `occupations_list.json`. */
function buildDistinctOccupationLabels(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const o = String(row?.occupation ?? '').trim();
    if (!o || seen.has(o)) continue;
    seen.add(o);
    out.push(o);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

const OCCUPATION_AUTOCOMPLETE_OPTIONS = buildDistinctOccupationLabels(occupationRows);

/** First PSA code per label (ambiguous occupation labels resolve to earliest row). */
function buildRegistrarLabelToFirstCodeMap(rows, labelField, codeField) {
  const map = new Map();
  for (const row of rows || []) {
    const label = String(row?.[labelField] ?? '').trim().toUpperCase();
    const code = String(row?.[codeField] ?? '').trim();
    if (!label) continue;
    if (!map.has(label)) map.set(label, code);
  }
  return map;
}

const PSA_CCR_CITIZENSHIP_REGISTRAR_MAP = buildRegistrarLabelToFirstCodeMap(
  ccrCitizenshipRows,
  'citizenship',
  'code',
);
const PSA_REGION_RELIGION_REGISTRAR_MAP = buildRegistrarLabelToFirstCodeMap(
  regionReligionRows,
  'religion',
  'code',
);
const PSA_OCCUPATION_REGISTRAR_MAP = buildRegistrarLabelToFirstCodeMap(
  occupationRows,
  'occupation',
  'code',
);

/** Map JSON code string to registrar box slots (pads numeric codes; retains short non-numeric). */
function formatRegistrarCodeDigits(rawCode, digitCount) {
  const c = String(rawCode ?? '').trim().toUpperCase();
  if (!c) return '';
  if (/^\d+$/.test(c)) {
    if (c.length > digitCount) return c.slice(-digitCount);
    return c.padStart(digitCount, '0');
  }
  if (c.length > digitCount) return c.slice(-digitCount);
  return c;
}

function registrarCodeFromAutocompleteLabel(label, map, digitCount) {
  const key = String(label ?? '').trim().toUpperCase();
  if (!key) return '';
  const raw = map.get(key);
  if (raw === undefined || raw === '') return '';
  return formatRegistrarCodeDigits(raw, digitCount);
}

/** Distinct CCR citizenship labels from `CCR_citizenships.json`. */
function buildDistinctCcrCitizenshipLabels(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const c = String(row?.citizenship ?? '').trim().toUpperCase();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

const CCR_CITIZENSHIP_AUTOCOMPLETE_OPTIONS = buildDistinctCcrCitizenshipLabels(ccrCitizenshipRows);

/** Shown alone when citizenship field is focused/clicked while empty (before user types). */
const CITIZENSHIP_FOCUS_ONLY_LABELS = ['FILIPINO'];

/** Distinct PSA province/country strings from `provinces_list.json` (province & country datalists). */
function buildPhGeoAutocompleteOptions(rows) {
  const provinces = new Set();
  const countries = new Set();
  for (const row of rows) {
    const province = String(row?.province ?? '').trim().toUpperCase();
    const country = String(row?.country ?? '').trim().toUpperCase();
    if (province) provinces.add(province);
    if (country) countries.add(country);
  }
  return {
    provinces: [...provinces].sort((a, b) => a.localeCompare(b)),
    jsonCountries: [...countries].sort((a, b) => a.localeCompare(b)),
  };
}

const PH_GEO_AUTOCOMPLETE = buildPhGeoAutocompleteOptions(provinceGeoRows);
const PH_GEO_PROVINCE_DATALIST_ID = 'certificate-of-live-birth-ph-province-datalist';
const PH_JSON_COUNTRY_DATALIST_ID = 'certificate-of-live-birth-ph-json-country-datalist';
const GENERIC_NOT_APPLICABLE_DATALIST_ID = 'certificate-of-live-birth-not-applicable-datalist';
const NOT_APPLICABLE_LABEL = 'NOT APPLICABLE';

/** Deduped PSA locality rows (one per `code`) for city picker internals. */
function buildPhGeoPickRecords(rows) {
  const byCode = new Map();
  for (const row of rows) {
    const city = String(row?.city ?? '').trim().toUpperCase();
    const province = String(row?.province ?? '').trim().toUpperCase();
    const country = String(row?.country ?? '').trim().toUpperCase();
    const code = String(row?.code ?? '').trim().toUpperCase();
    if (!city) continue;
    if (byCode.has(code)) continue;
    byCode.set(code, { city, province, country, code });
  }
  return [...byCode.values()];
}

const PH_GEO_PICK_RECORDS = buildPhGeoPickRecords(provinceGeoRows);

function getPhCityPickerSuggestions(query, maxRows = 40) {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const scored = [];
  for (const r of PH_GEO_PICK_RECORDS) {
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
      key: `${r.code}-short`,
      label: `${r.city} | ${r.country}`,
      record: r,
      /** Short line: fill city/country/code only; leave province blank. */
      omitProvince: true,
    });
    out.push({
      key: `${r.code}-full`,
      label: `${r.city} | ${r.province} | ${r.country}`,
      record: r,
      omitProvince: false,
    });
    if (out.length >= maxRows) break;
  }
  return out;
}

const CertificatePhGeoDataLists = memo(function CertificatePhGeoDataLists() {
  return (
    <>
      <datalist id={PH_GEO_PROVINCE_DATALIST_ID}>
        <option value={NOT_APPLICABLE_LABEL} />
        {PH_GEO_AUTOCOMPLETE.provinces.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <datalist id={PH_JSON_COUNTRY_DATALIST_ID}>
        <option value={NOT_APPLICABLE_LABEL} />
        {PH_GEO_AUTOCOMPLETE.jsonCountries.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <datalist id={GENERIC_NOT_APPLICABLE_DATALIST_ID}>
        <option value={NOT_APPLICABLE_LABEL} />
      </datalist>
    </>
  );
});

function buildIso3166CountryOptions() {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    const list = [];
    for (let i = 0; i < 26; i += 1) {
      for (let j = 0; j < 26; j += 1) {
        const code = String.fromCharCode(65 + i, 65 + j);
        const name = dn.of(code);
        if (!name || name === code) continue;
        list.push({ code, name: String(name).toUpperCase() });
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

/** Full country name for PDF / printed field (from ISO code or legacy text). Always uppercase. */
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
      if (n && n !== code) return String(n).toUpperCase();
    } catch (_) {}
    return code;
  }
  return t.toUpperCase();
}

/** Map PSA `country` text from `provinces_list.json` to ISO alpha-2 for residence selects. */
function phGeoCountryToIsoCode(countryUpper) {
  const c = String(countryUpper || '').trim().toUpperCase();
  if (!c || c === 'NOT APPLICABLE') return '';
  if (c === 'PHILIPPINES') return 'PH';
  const hit = COUNTRY_OPTIONS.find((o) => o.name.toUpperCase() === c);
  if (hit) return hit.code;
  const normalized = normalizeStoredCountry(c);
  if (normalized.length === 2 && COUNTRY_CODE_SET.has(normalized.toUpperCase())) return normalized.toUpperCase();
  return '';
}

/** 8-digit PH locality PSA code from city / province / country (matches `provinces_list`). */
function registrarResidenceCodeFromGeoPick(city, province, countryIso) {
  const cityU = String(city ?? '').trim().toUpperCase();
  const provinceU = String(province ?? '').trim().toUpperCase();
  const iso = String(countryIso ?? '').trim().toUpperCase();
  if (!cityU) return '';
  for (const row of provinceGeoRows || []) {
    const rc = String(row?.city ?? '').trim().toUpperCase();
    const rp = String(row?.province ?? '').trim().toUpperCase();
    if (rc !== cityU) continue;
    if (provinceU && rp !== provinceU) continue;
    if (iso) {
      const rowIso = phGeoCountryToIsoCode(String(row?.country ?? '').trim().toUpperCase());
      if (rowIso && rowIso !== iso) continue;
    }
    const raw = String(row?.code ?? '').trim().toUpperCase();
    return formatRegistrarCodeDigits(raw, 8);
  }
  return '';
}

function sanitizePurpose(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

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

/** Items 21b–25 signature lines: "May 7, 2026" (month name, day without leading zero, 4-digit year). */
function dateToSignatureLongText(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${CALENDAR_MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Parse "May 7, 2026"-style strings for calendar seeding. */
function parseLongMonthCommaYearSeed(text) {
  const t = trimStr(text);
  if (!t) return null;
  const m = /^([A-Za-z]+)\s+(\d{1,2})\s*,\s*(\d{4})\s*$/.exec(t);
  if (!m) return null;
  const monthName = m[1].toLowerCase();
  const day = Number(m[2]);
  const year = Number(m[3]);
  const monthIndex = CALENDAR_MONTH_LABELS.findIndex((label) => label.toLowerCase() === monthName);
  if (monthIndex < 0 || !Number.isInteger(day) || !Number.isInteger(year)) return null;
  const dt = new Date(year, monthIndex, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== monthIndex || dt.getDate() !== day) return null;
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
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t);
  if (dmy) {
    const di = Number(dmy[1]);
    const mi = Number(dmy[2]);
    const yi = Number(dmy[3]);
    if (!Number.isInteger(yi) || !Number.isInteger(mi) || !Number.isInteger(di)) return null;
    const dt = new Date(yi, mi - 1, di);
    if (dt.getFullYear() === yi && dt.getMonth() === mi - 1 && dt.getDate() === di) return dt;
  }
  const longText = parseLongMonthCommaYearSeed(t);
  if (longText) return longText;
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

/** Long month format for signature/date lines (items 21b–25), e.g. May 7, 2026. */
function formatSignatureLineDateLocal(d) {
  return dateToSignatureLongText(d);
}

/** Normalize stored values (legacy ISO, DD-MM-YYYY, or long text) for display on load. */
function toSignatureLineDateDisplay(value) {
  const t = trimStr(value);
  if (!t) return '';
  const parsed = parseFlexibleDateSeed(t);
  return parsed ? dateToSignatureLongText(parsed) : t;
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
        <option value={t}>{String(t).toUpperCase()} (update)</option>
      )}
      {COUNTRY_OPTIONS.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}

function FormLine({
  value = '',
  onChange,
  placeholder,
  className = '',
  width,
  readOnly,
  disabled,
  useLowerStyle = false,
  datalistId,
  ariaLabel,
  includeNotApplicable = true,
}) {
  if (includeNotApplicable && !datalistId) {
    return (
      <FormTextCombo
        value={value}
        onInputChange={onChange}
        suggestionOptions={[]}
        placeholder={placeholder}
        className={className}
        width={width || 'flex-1 min-w-0'}
        ariaLabel={ariaLabel || placeholder || 'Text field'}
        includeNotApplicable
      />
    );
  }

  const borderColor = useLowerStyle ? COLORS.borderGray : COLORS.accentGreen;
  const locked = Boolean(disabled || readOnly);
  const listId = includeNotApplicable ? datalistId || GENERIC_NOT_APPLICABLE_DATALIST_ID : datalistId;
  return (
    <input
      type="text"
      list={listId}
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={locked ? undefined : (e) => onChange(e.target.value.toUpperCase())}
      readOnly={readOnly && !disabled}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`focus:outline-none focus:ring-0 min-h-[1.25rem] ${width || 'flex-1 min-w-0'} ${
        disabled ? 'cursor-not-allowed opacity-70' : ''
      } ${className}`}
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

/**
 * PSA city picker: dropdown lines like `CITY | COUNTRY` and `CITY | PROVINCE | COUNTRY`.
 * Short line clears province; full line sets province from the PSA row.
 */
function FormPhCityCombo({
  cityValue = '',
  onCityInputChange,
  onGeoPick,
  onCityEmptied,
  placeholder,
  className = '',
  width,
  ariaLabel,
  maxSuggestionRows = 40,
}) {
  const listboxBaseId = useId();
  const listboxId = `${listboxBaseId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef(null);

  const suggestions = useMemo(
    () => getPhCityPickerSuggestions(cityValue, maxSuggestionRows),
    [cityValue, maxSuggestionRows],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [cityValue]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const applyItem = useCallback(
    (item) => {
      if (!item) return;
      const { record, omitProvince } = item;
      onGeoPick({
        ...record,
        province: omitProvince ? '' : record.province,
      });
      setOpen(false);
    },
    [onGeoPick],
  );

  const borderColor = COLORS.accentGreen;
  const showList = open && suggestions.length > 0;

  return (
    <div className={`relative min-w-0 ${width || ''} ${className}`} ref={wrapRef}>
      <input
        type="text"
        value={cityValue}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={showList ? `${listboxId}-opt-${activeIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          onCityInputChange(v);
          if (!v.trim() && onCityEmptied) onCityEmptied();
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length) setOpen(true);
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
        className="focus:outline-none focus:ring-0 min-h-[1.25rem] w-full"
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          backgroundColor: COLORS.white,
          border: 'none',
          borderBottom: `1px solid ${borderColor}`,
          borderRadius: 0,
          padding: '2px 4px',
          color: COLORS.black,
        }}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-[100] mt-0.5 max-h-56 min-w-full w-max max-w-[min(100vw-1rem,36rem)] overflow-auto rounded border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.key}
              id={`${listboxId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`cursor-pointer px-2 py-1.5 text-xs text-slate-800 sm:text-sm ${
                idx === activeIndex ? 'bg-emerald-200' : 'hover:bg-emerald-100'
              }`}
              style={{ fontFamily: FONT_FAMILY }}
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

function FormOccupationLine({ value = '', onChange, placeholder, className = '', width, ariaLabel }) {
  return (
    <FormTextCombo
      value={value}
      onInputChange={onChange}
      suggestionOptions={OCCUPATION_AUTOCOMPLETE_OPTIONS}
      placeholder={placeholder}
      ariaLabel={ariaLabel || placeholder || 'Occupation'}
      className={className}
      width={width || 'flex-1 min-w-0'}
      includeNotApplicable={false}
    />
  );
}

function FormReligionLine({ value = '', onChange, placeholder, className = '', width, ariaLabel }) {
  return (
    <FormTextCombo
      value={value}
      onInputChange={onChange}
      suggestionOptions={RELIGION_AUTOCOMPLETE_OPTIONS}
      placeholder={placeholder}
      ariaLabel={ariaLabel || placeholder || 'Religion or religious sect'}
      className={className}
      width={width || 'flex-1 min-w-0'}
      includeNotApplicable={false}
    />
  );
}

function FormCitizenshipLine({ value = '', onChange, placeholder, className = '', width, ariaLabel }) {
  return (
    <FormTextCombo
      value={value}
      onInputChange={onChange}
      suggestionOptions={CCR_CITIZENSHIP_AUTOCOMPLETE_OPTIONS}
      idleFocusSuggestions={CITIZENSHIP_FOCUS_ONLY_LABELS}
      placeholder={placeholder}
      ariaLabel={ariaLabel || placeholder || 'Citizenship'}
      className={className}
      width={width || 'flex-1 min-w-0'}
      includeNotApplicable={false}
    />
  );
}

function getAutocompleteLabelSuggestions(query, suggestionOptions, maxRows = 40, includeNotApplicable = true) {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const mergedSuggestionOptions = includeNotApplicable
    ? [NOT_APPLICABLE_LABEL, ...suggestionOptions]
    : suggestionOptions;
  const scored = [];
  const seen = new Set();
  for (const rawLabel of mergedSuggestionOptions) {
    const label = String(rawLabel || '').trim().toUpperCase();
    if (!label || seen.has(label) || !label.includes(q)) continue;
    seen.add(label);
    scored.push({ label, pri: label.startsWith(q) ? 0 : 1 });
  }
  scored.sort((a, b) => a.pri - b.pri || a.label.localeCompare(b.label));
  return scored.slice(0, maxRows).map(({ label }, idx) => ({
    key: `${label}-${idx}`,
    label,
  }));
}

function FormTextCombo({
  value = '',
  onInputChange,
  onOptionPick,
  suggestionOptions,
  idleFocusSuggestions,
  placeholder,
  className = '',
  width,
  ariaLabel,
  maxSuggestionRows = 40,
  includeNotApplicable = true,
}) {
  const listboxBaseId = useId();
  const listboxId = `${listboxBaseId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef(null);

  const valueTrimmed = String(value ?? '').trim();
  const showIdleFocusList =
    open &&
    idleFocusSuggestions &&
    idleFocusSuggestions.length > 0 &&
    !valueTrimmed;

  const suggestions = useMemo(() => {
    if (showIdleFocusList) {
      return idleFocusSuggestions
        .map((raw, idx) => {
          const label = String(raw ?? '').trim().toUpperCase();
          return label ? { key: `idle-focus-${label}-${idx}`, label } : null;
        })
        .filter(Boolean);
    }
    return getAutocompleteLabelSuggestions(value, suggestionOptions, maxSuggestionRows, includeNotApplicable);
  }, [
    value,
    suggestionOptions,
    maxSuggestionRows,
    includeNotApplicable,
    showIdleFocusList,
    idleFocusSuggestions,
  ]);

  const canOpenIdleOnFocus =
    idleFocusSuggestions && idleFocusSuggestions.length > 0 && !valueTrimmed;

  useEffect(() => {
    setActiveIndex(0);
  }, [value, open, showIdleFocusList]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const applyItem = useCallback(
    (item) => {
      if (!item) return;
      onInputChange(item.label);
      onOptionPick?.(item.label);
      setOpen(false);
    },
    [onInputChange, onOptionPick],
  );

  const borderColor = COLORS.accentGreen;
  const showList = open && suggestions.length > 0;

  return (
    <div className={`relative min-w-0 ${width || ''} ${className}`} ref={wrapRef}>
      <input
        type="text"
        value={value}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={showList ? `${listboxId}-opt-${activeIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          const nextValue = e.target.value.toUpperCase();
          onInputChange(nextValue);
          setOpen(true);
        }}
        onFocus={() => {
          if (canOpenIdleOnFocus || suggestions.length) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (
            (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
            (canOpenIdleOnFocus || suggestions.length)
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
        className="focus:outline-none focus:ring-0 min-h-[1.25rem] w-full"
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          backgroundColor: COLORS.white,
          border: 'none',
          borderBottom: `1px solid ${borderColor}`,
          borderRadius: 0,
          padding: '2px 4px',
          color: COLORS.black,
        }}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-[100] mt-0.5 max-h-56 min-w-full w-max max-w-[min(100vw-1rem,36rem)] overflow-auto rounded border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.key}
              id={`${listboxId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`cursor-pointer px-2 py-1.5 text-xs text-slate-800 sm:text-sm ${
                idx === activeIndex ? 'bg-emerald-200' : 'hover:bg-emerald-100'
              }`}
              style={{ fontFamily: FONT_FAMILY }}
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
  const registrarInputRefs = useRef({});
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
        if (!String(base.motherCountry || '').trim()) {
          base.motherCountry = countryCodeToDisplayName(base.motherResidenceCountry);
        }
        if (!String(base.fatherCountry || '').trim()) {
          base.fatherCountry = countryCodeToDisplayName(base.fatherResidenceCountry);
        }
        base.motherCountry = String(base.motherCountry || '').trim().toUpperCase();
        base.fatherCountry = String(base.fatherCountry || '').trim().toUpperCase();
        base.marriagePlaceCountry = String(base.marriagePlaceCountry || '').trim().toUpperCase();
        const signatureDateKeys = [
          'attendantDate',
          'informantDate',
          'preparedByDate',
          'receivedByDate',
          'registeredByDate',
        ];
        for (const key of signatureDateKeys) {
          base[key] = toSignatureLineDateDisplay(base[key]);
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
    const payload = {
      ...form,
      motherCountry: String(form.motherCountry || '').trim().toUpperCase(),
      fatherCountry: String(form.fatherCountry || '').trim().toUpperCase(),
      marriagePlaceCountry: String(form.marriagePlaceCountry || '').trim().toUpperCase(),
    };
    if (JSON.stringify(payload) === lastSavedRef.current) return;
    lastSavedRef.current = JSON.stringify(payload);
    setSaving(true);
    try {
      await childrenApi.updateCertificateOfLiveBirth(id, payload);
      setForm((prev) => ({
        ...prev,
        motherCountry: payload.motherCountry,
        fatherCountry: payload.fatherCountry,
        marriagePlaceCountry: payload.marriagePlaceCountry,
      }));
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

  useEffect(() => {
    if (loading) return;

    const next8 = registrarCodeFromAutocompleteLabel(
      form.motherCitizenship,
      PSA_CCR_CITIZENSHIP_REGISTRAR_MAP,
      2,
    );
    const next9 = registrarCodeFromAutocompleteLabel(
      form.motherReligion,
      PSA_REGION_RELIGION_REGISTRAR_MAP,
      2,
    );
    const next11 = registrarCodeFromAutocompleteLabel(
      form.motherOccupation,
      PSA_OCCUPATION_REGISTRAR_MAP,
      3,
    );
    const next13 = registrarResidenceCodeFromGeoPick(
      form.motherResidenceCity,
      form.motherResidenceProvince,
      form.motherResidenceCountry,
    );
    const next15 = registrarCodeFromAutocompleteLabel(
      form.fatherCitizenship,
      PSA_CCR_CITIZENSHIP_REGISTRAR_MAP,
      2,
    );
    const next16 = registrarCodeFromAutocompleteLabel(
      form.fatherReligion,
      PSA_REGION_RELIGION_REGISTRAR_MAP,
      2,
    );
    const next17 = registrarCodeFromAutocompleteLabel(
      form.fatherOccupation,
      PSA_OCCUPATION_REGISTRAR_MAP,
      3,
    );
    const next19 = registrarResidenceCodeFromGeoPick(
      form.fatherResidenceCity,
      form.fatherResidenceProvince,
      form.fatherResidenceCountry,
    );

    setForm((prev) => {
      if (
        prev.registrarBox8 === next8 &&
        prev.registrarBox9 === next9 &&
        prev.registrarBox11 === next11 &&
        prev.registrarBox13 === next13 &&
        prev.registrarBox15 === next15 &&
        prev.registrarBox16 === next16 &&
        prev.registrarBox17 === next17 &&
        prev.registrarBox19 === next19
      ) {
        return prev;
      }
      return {
        ...prev,
        registrarBox8: next8,
        registrarBox9: next9,
        registrarBox11: next11,
        registrarBox13: next13,
        registrarBox15: next15,
        registrarBox16: next16,
        registrarBox17: next17,
        registrarBox19: next19,
      };
    });
  }, [
    form.motherCitizenship,
    form.motherReligion,
    form.motherOccupation,
    form.motherResidenceCity,
    form.motherResidenceProvince,
    form.motherResidenceCountry,
    form.fatherCitizenship,
    form.fatherReligion,
    form.fatherOccupation,
    form.fatherResidenceCity,
    form.fatherResidenceProvince,
    form.fatherResidenceCountry,
    loading,
  ]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateNumericMaxTwoDigits = (key, rawValue, fieldLabel) => {
    const { value, hadNonDigit, exceededLength } = normalizeTwoDigitNumericInput(rawValue);
    if (hadNonDigit) {
      toast.error(`${fieldLabel}: digits only (0–9), maximum 2 digits.`, { id: `cert-2dig-char-${key}` });
    } else if (exceededLength) {
      toast.error(`${fieldLabel}: maximum 2 digits.`, { id: `cert-2dig-len-${key}` });
    }
    update(key, value);
  };
  const focusRegistrarInput = (key, index) => {
    const input = registrarInputRefs.current?.[`${key}-${index}`];
    if (input) input.focus();
  };
  const updateRegistrarBoxChars = (key, digits, index, rawValue) => {
    const nextValue = String(rawValue || '').toUpperCase().replace(/\s+/g, '');
    setForm((prev) => {
      const current = String(prev[key] || '');
      const chars = Array.from({ length: digits }, (_, i) => current.charAt(i) || '');
      if (!nextValue) {
        chars[index] = '';
      } else {
        const values = nextValue.split('');
        for (let i = 0; i < values.length && index + i < digits; i += 1) {
          chars[index + i] = values[i];
        }
      }
      return { ...prev, [key]: chars.join('').replace(/\s+$/, '') };
    });
    const jump = nextValue.length > 1 ? nextValue.length : 1;
    const nextIndex = Math.min(index + jump, digits - 1);
    if (nextValue) setTimeout(() => focusRegistrarInput(key, nextIndex), 0);
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-2 pb-8 sm:px-4 print:max-w-none print:px-0 print:pb-0">
      <div className="certificate-sticky-bar sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:gap-4 sm:px-4 print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to applicant</Link>
        <span className="order-3 w-full truncate text-sm font-medium text-slate-700 sm:order-none sm:w-auto">
          {child.first_name} {child.last_name}
        </span>
        {saving && <span className="text-sm text-emerald-600">Saving…</span>}
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
        <CertificatePhGeoDataLists />
          <div className="certificate-card" id="header">
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
                <FormLine
                  value={form.province}
                  onChange={(v) => update('province', v)}
                  placeholder="(Province)"
                  disabled
                  datalistId={PH_GEO_PROVINCE_DATALIST_ID}
                  aria-label="Certificate province"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="mb-1">City/Municipality</span>
                <FormPhCityCombo
                  cityValue={form.cityMunicipality}
                  onCityInputChange={(v) => update('cityMunicipality', v)}
                  onCityEmptied={() => update('province', '')}
                  onGeoPick={(r) =>
                    setForm((p) => ({
                      ...p,
                      cityMunicipality: r.city,
                      province: r.province,
                    }))
                  }
                  placeholder="(City/Municipality)"
                  width="w-full"
                  ariaLabel="Certificate city or municipality"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="mb-1">Registry No.</span>
                <FormLine value={form.registryNo} onChange={(v) => update('registryNo', v)} placeholder="(Registry No.)" className="w-full" width="w-full" />
              </div>
            </div>
          </div>
            </header>
          </div>

          <div className="certificate-card" id="child">
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
                  <FormPhCityCombo
                    cityValue={form.placeOfBirthCity}
                    onCityInputChange={(v) => update('placeOfBirthCity', v)}
                    onCityEmptied={() => update('placeOfBirthProvince', '')}
                    onGeoPick={(r) =>
                      setForm((p) => ({
                        ...p,
                        placeOfBirthCity: r.city,
                        placeOfBirthProvince: r.province,
                      }))
                    }
                    placeholder="(City/Municipality)"
                    width="w-full"
                    ariaLabel="Place of birth city or municipality"
                  />
                  <FormLine
                    value={form.placeOfBirthProvince}
                    onChange={(v) => update('placeOfBirthProvince', v)}
                    placeholder="(Province)"
                    disabled
                    datalistId={PH_GEO_PROVINCE_DATALIST_ID}
                    aria-label="Place of birth province"
                  />
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
                <FormLine value={form.weightGrams} onChange={(v) => update('weightGrams', v)} placeholder="(e.g. 3200)" className="w-24" width="w-24" includeNotApplicable={false} />
                <span>grams</span>
              </div>
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className="certificate-card" id="mother">
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
              <FormCitizenshipLine
                value={form.motherCitizenship}
                onChange={(v) => update('motherCitizenship', v)}
                placeholder="(Citizenship)"
                ariaLabel="Mother citizenship"
                className="w-full"
                width="w-full"
              />
            </div>
            <div>
              <label className="block mb-1 font-normal">9. RELIGION/RELIGIOUS SECT</label>
              <FormReligionLine value={form.motherReligion} onChange={(v) => update('motherReligion', v)} placeholder="(Religion/Religious sect)" ariaLabel="Mother religion or religious sect" className="w-full" width="w-full" />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 font-normal">10a. Total number of children born alive</label>
                <FormLine
                  value={form.motherChildrenBornAlive}
                  onChange={(v) => updateNumericMaxTwoDigits('motherChildrenBornAlive', v, '10a')}
                  placeholder="(Number)"
                  className="w-full"
                  width="w-full"
                  includeNotApplicable={false}
                />
              </div>
              <div>
                <label className="block mb-1 font-normal">10b. No. of children still living including this birth</label>
                <FormLine
                  value={form.motherChildrenLiving}
                  onChange={(v) => updateNumericMaxTwoDigits('motherChildrenLiving', v, '10b')}
                  placeholder="(Number)"
                  className="w-full"
                  width="w-full"
                  includeNotApplicable={false}
                />
              </div>
              <div>
                <label className="block mb-1 font-normal">10c. No. of children born alive but are now dead</label>
                <FormLine
                  value={form.motherChildrenDead}
                  onChange={(v) => updateNumericMaxTwoDigits('motherChildrenDead', v, '10c')}
                  placeholder="(Number)"
                  className="w-full"
                  width="w-full"
                  includeNotApplicable={false}
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">11. OCCUPATION</label>
              <FormOccupationLine value={form.motherOccupation} onChange={(v) => update('motherOccupation', v)} placeholder="(Occupation)" ariaLabel="Mother occupation" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">12. AGE at the time of this birth (completed years)</label>
              <div className="flex items-baseline gap-2">
                <FormLine
                  value={form.motherAge}
                  onChange={(v) => updateNumericMaxTwoDigits('motherAge', v, '12')}
                  placeholder="(Age)"
                  className="w-20"
                  width="w-20"
                  includeNotApplicable={false}
                />
                <span style={{ fontSize: '14px' }}>#</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">13. RESIDENCE</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.motherResidenceLine1} onChange={(v) => update('motherResidenceLine1', v)} placeholder="(House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormPhCityCombo
                    cityValue={form.motherResidenceCity}
                    onCityInputChange={(v) => update('motherResidenceCity', v)}
                    onCityEmptied={() => update('motherResidenceProvince', '')}
                    onGeoPick={(r) => {
                      const code = phGeoCountryToIsoCode(r.country);
                      setForm((p) => ({
                        ...p,
                        motherResidenceCity: r.city,
                        motherResidenceProvince: r.province,
                        motherResidenceCountry: code,
                        motherCountry: countryCodeToDisplayName(code),
                      }));
                    }}
                    placeholder="(City/Municipality)"
                    className="w-full"
                    width="w-full"
                    ariaLabel="Mother residence city or municipality"
                  />
                  <FormLine
                    value={form.motherResidenceProvince}
                    onChange={(v) => update('motherResidenceProvince', v)}
                    placeholder="(Province)"
                    disabled
                    className="w-full"
                    width="w-full"
                    datalistId={PH_GEO_PROVINCE_DATALIST_ID}
                    aria-label="Mother residence province"
                  />
                  <FormCountrySelect
                    value={form.motherResidenceCountry}
                    onChange={(v) => {
                      const n = normalizeStoredCountry(v);
                      setForm((p) => ({
                        ...p,
                        motherResidenceCountry: n,
                        motherCountry: countryCodeToDisplayName(n),
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

          <div className="certificate-card" id="father">
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
              <FormCitizenshipLine
                value={form.fatherCitizenship}
                onChange={(v) => update('fatherCitizenship', v)}
                placeholder="(Citizenship)"
                ariaLabel="Father citizenship"
                className="w-full"
                width="w-full"
              />
            </div>
            <div>
              <label className="block mb-1 font-normal">16. RELIGION/RELIGIOUS SECT</label>
              <FormReligionLine value={form.fatherReligion} onChange={(v) => update('fatherReligion', v)} placeholder="(Religion/Religious sect)" ariaLabel="Father religion or religious sect" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">17. OCCUPATION</label>
              <FormOccupationLine value={form.fatherOccupation} onChange={(v) => update('fatherOccupation', v)} placeholder="(Occupation)" ariaLabel="Father occupation" className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">18. AGE at the time of this birth (completed years)</label>
              <div className="flex items-baseline gap-2">
                <FormLine
                  value={form.fatherAge}
                  onChange={(v) => updateNumericMaxTwoDigits('fatherAge', v, '18')}
                  placeholder="(Age)"
                  className="w-20"
                  width="w-20"
                  includeNotApplicable={false}
                />
                <span style={{ fontSize: '14px' }}>#</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">19. RESIDENCE</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.fatherResidenceLine1} onChange={(v) => update('fatherResidenceLine1', v)} placeholder="(House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormPhCityCombo
                    cityValue={form.fatherResidenceCity}
                    onCityInputChange={(v) => update('fatherResidenceCity', v)}
                    onCityEmptied={() => update('fatherResidenceProvince', '')}
                    onGeoPick={(r) => {
                      const code = phGeoCountryToIsoCode(r.country);
                      setForm((p) => ({
                        ...p,
                        fatherResidenceCity: r.city,
                        fatherResidenceProvince: r.province,
                        fatherResidenceCountry: code,
                        fatherCountry: countryCodeToDisplayName(code),
                      }));
                    }}
                    placeholder="(City/Municipality)"
                    className="w-full"
                    width="w-full"
                    ariaLabel="Father residence city or municipality"
                  />
                  <FormLine
                    value={form.fatherResidenceProvince}
                    onChange={(v) => update('fatherResidenceProvince', v)}
                    placeholder="(Province)"
                    disabled
                    className="w-full"
                    width="w-full"
                    datalistId={PH_GEO_PROVINCE_DATALIST_ID}
                    aria-label="Father residence province"
                  />
                  <FormCountrySelect
                    value={form.fatherResidenceCountry}
                    onChange={(v) => {
                      const n = normalizeStoredCountry(v);
                      setForm((p) => ({
                        ...p,
                        fatherResidenceCountry: n,
                        fatherCountry: countryCodeToDisplayName(n),
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

          <div className="certificate-card" id="marriage">
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
                <FormPhCityCombo
                  cityValue={form.marriagePlaceCity}
                  onCityInputChange={(v) => update('marriagePlaceCity', v)}
                  onCityEmptied={() => update('marriagePlaceProvince', '')}
                  onGeoPick={(r) =>
                    setForm((p) => ({
                      ...p,
                      marriagePlaceCity: r.city,
                      marriagePlaceProvince: r.province,
                      marriagePlaceCountry: r.country,
                    }))
                  }
                  placeholder="(City/Municipality)"
                  className="w-full"
                  width="w-full"
                  ariaLabel="Parents marriage place city or municipality"
                />
                <FormLine
                  value={form.marriagePlaceProvince}
                  onChange={(v) => update('marriagePlaceProvince', v)}
                  placeholder="(Province)"
                  disabled
                  className="w-full"
                  width="w-full"
                  datalistId={PH_GEO_PROVINCE_DATALIST_ID}
                  aria-label="Parents marriage place province"
                />
                <FormLine
                  value={form.marriagePlaceCountry}
                  onChange={(v) => update('marriagePlaceCountry', v)}
                  placeholder="(Country)"
                  className="w-full"
                  width="w-full"
                  datalistId={PH_JSON_COUNTRY_DATALIST_ID}
                  aria-label="Parents marriage place country"
                />
              </div>
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className="certificate-card" id="attendant">
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
                <FormLine value={form.attendantDate} onChange={(v) => update('attendantDate', v)} placeholder="(May 7, 2026)" className="flex-1 min-w-0" />
                <CertificateDatePicker
                  pickerId="attendantDate"
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                  seedText={form.attendantDate}
                  onPick={(d) => {
                    setForm((p) => ({ ...p, attendantDate: formatSignatureLineDateLocal(d) }));
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

          <div className="certificate-card" id="signatures">
        <SectionPanel title="Signatures">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <div>
            <h3 className="mb-2 text-base font-bold">22. CERTIFICATION OF INFORMANT</h3>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>I hereby certify that all information supplied are true and correct to my own knowledge and belief.</p>
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.informantName} onChange={(v) => update('informantName', v)} placeholder="(Name in print)" /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Relationship to the Child</p><FormLine value={form.informantRelationship} onChange={(v) => update('informantRelationship', v)} placeholder="(e.g. Mother, Father)" /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Address</p>
                <FormLine
                  value={form.informantAddress}
                  onChange={(v) => update('informantAddress', v.toUpperCase())}
                  placeholder="(Complete address)"
                  className="w-full"
                />
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.informantDate} onChange={(v) => update('informantDate', v)} placeholder="(MM/DD/YYYY)" />
                  <CertificateDatePicker
                    pickerId="informantDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.informantDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, informantDate: formatSignatureLineDateLocal(d) }));
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
              
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
                <FormTextCombo
                  value={form.preparedByName}
                  onInputChange={(v) => {
                    update('preparedByName', v);
                    const chosen = LCRO_STAFF_MEMBERS.find((o) => o.name === v);
                    if (chosen) update('preparedByTitle', chosen.title);
                  }}
                  onOptionPick={(pickedName) => {
                    const chosen = LCRO_STAFF_MEMBERS.find((o) => o.name === pickedName);
                    if (chosen) update('preparedByTitle', chosen.title);
                  }}
                  suggestionOptions={LCRO_STAFF_MEMBER_NAMES}
                  placeholder="(Name in print)"
                  ariaLabel="Prepared by name in print"
                  className="w-full"
                  width="w-full"
                  includeNotApplicable={false}
                />
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.preparedByTitle} onChange={(v) => update('preparedByTitle', v)} placeholder="(Title or position)" /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.preparedByDate} onChange={(v) => update('preparedByDate', v)} placeholder="(MM/DD/YYYY)" />
                  <CertificateDatePicker
                    pickerId="preparedByDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.preparedByDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, preparedByDate: formatSignatureLineDateLocal(d) }));
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
                  <FormLine value={form.receivedByDate} onChange={(v) => update('receivedByDate', v)} placeholder="(MM/DD/YYYY)" />
                  <CertificateDatePicker
                    pickerId="receivedByDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.receivedByDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, receivedByDate: formatSignatureLineDateLocal(d) }));
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
                  <FormLine value={form.registeredByDate} onChange={(v) => update('registeredByDate', v)} placeholder="(MM/DD/YYYY)" />
                  <CertificateDatePicker
                    pickerId="registeredByDate"
                    openPickerId={openPickerId}
                    setOpenPickerId={setOpenPickerId}
                    seedText={form.registeredByDate}
                    onPick={(d) => {
                      setForm((p) => ({ ...p, registeredByDate: formatSignatureLineDateLocal(d) }));
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
        <div
          className="certificate-card"
          style={{
            fontFamily: FONT_FAMILY,
            color: COLORS.black,
            marginTop: '8px',
          }}
        >
          <div style={{ borderBottom: `2px solid ${COLORS.accentGreen}`, padding: '8px 10px' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
              REMARKS/ANNOTATIONS (For LCRO/OCRG Use Only)
            </p>
            <textarea
              value={form.remarks}
              onChange={(e) => update('remarks', e.target.value.toUpperCase())}
              placeholder="(Enter remarks/annotations)"
              className="mt-2 w-full resize-none focus:outline-none focus:ring-0"
              rows={3}
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: '16px',
                backgroundColor: COLORS.white,
                border: `1px solid ${COLORS.accentGreen}`,
                borderRadius: 0,
                padding: '4px 6px',
                color: COLORS.black,
              }}
            />
          </div>
          <div style={{ padding: '8px 10px' }}>
            <div
              className="flex flex-col gap-2"
              style={{
                border: `2px solid ${COLORS.accentGreen}`,
                borderRadius: 0,
                padding: '6px',
              }}
            >
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
                TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR
              </p>
              <div className="flex-1 min-w-0 overflow-x-auto">
                <div className="inline-flex gap-2" style={{ minWidth: '860px' }}>
                  {REGISTRAR_BOX_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          margin: '0 0 3px 2px',
                          lineHeight: 1,
                        }}
                      >
                        {group.label}
                      </p>
                      <div className="flex">
                        {Array.from({ length: group.digits }).map((_, idx) => (
                          <input
                            key={`${group.label}-${idx}`}
                            value={String(form[group.key] || '').charAt(idx) || ''}
                            ref={(el) => {
                              registrarInputRefs.current[`${group.key}-${idx}`] = el;
                            }}
                            onChange={(e) => updateRegistrarBoxChars(group.key, group.digits, idx, e.target.value)}
                            onPaste={(e) => {
                              e.preventDefault();
                              updateRegistrarBoxChars(
                                group.key,
                                group.digits,
                                idx,
                                e.clipboardData.getData('text'),
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !String(form[group.key] || '').charAt(idx) && idx > 0) {
                                setTimeout(() => focusRegistrarInput(group.key, idx - 1), 0);
                              }
                            }}
                            inputMode="text"
                            style={{
                              width: '18px',
                              height: '28px',
                              borderTop: `1px solid ${COLORS.accentGreen}`,
                              borderBottom: `1px solid ${COLORS.accentGreen}`,
                              borderLeft: `1px solid ${COLORS.accentGreen}`,
                              borderRight:
                                idx === group.digits - 1 ? `1px solid ${COLORS.accentGreen}` : 'none',
                              display: 'inline-block',
                              textAlign: 'center',
                              fontSize: '14px',
                              fontFamily: FONT_FAMILY,
                              color: COLORS.black,
                              backgroundColor: COLORS.white,
                              borderRadius: 0,
                              outline: 'none',
                              padding: 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="certificate-sticky-bar sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:gap-4 sm:px-4 print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to applicant</Link>
        <span className="order-3 w-full truncate text-sm font-medium text-slate-700 sm:order-none sm:w-auto">
         Changes save automatically.
        </span>
      </div>
      </div>
    </div>
  );
}



