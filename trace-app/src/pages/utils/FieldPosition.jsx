import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../../services/api';
import { notifyElectronSavePdfResult } from '../../utils/notifyElectronSavePdfResult';
import { onPdfSavedOpenInBrowser } from '../../utils/openSavedPdfInBrowser';

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
};

const FONT_FAMILY = 'Arial';

const REGISTRAR_BOX_Y = 3947;
const REGISTRAR_BOX_COORDINATES = [
  { label: '8', valueKey: 'registrarBox8', xs: [306, 375] },
  { label: '9', valueKey: 'registrarBox9', xs: [435, 495] },
  { label: '11', valueKey: 'registrarBox11', xs: [576, 636, 708] },
  { label: '13', valueKey: 'registrarBox13', xs: [789, 849, 921, 978, 1050, 1110, 1179, 1239] },
  { label: '15', valueKey: 'registrarBox15', xs: [1320, 1380] },
  { label: '16', valueKey: 'registrarBox16', xs: [1464, 1533] },
  { label: '17', valueKey: 'registrarBox17', xs: [1641, 1686, 1770] },
  { label: '19', valueKey: 'registrarBox19', xs: [1854, 1911, 1971, 2043, 2112, 2172, 2244, 2301] },
];

const REGISTRAR_BOX_FIELD_POSITIONS = REGISTRAR_BOX_COORDINATES.reduce((acc, group) => {
  group.xs.forEach((x, idx) => {
    acc[`registrar_${group.label}_${idx}`] = { x, y: REGISTRAR_BOX_Y };
  });
  return acc;
}, {});

const REGISTRAR_BOX_VALUE_MAP = REGISTRAR_BOX_COORDINATES.flatMap((group) =>
  group.xs.map((_, idx) => ({
    key: `registrar_${group.label}_${idx}`,
    getValue: (getVal) => String(getVal(group.valueKey) ?? '').charAt(idx),
  })),
);

// PDF Layout dimensions (layout pixels)
const PDF_LAYOUT = {
  document: {
    width: 2550,
    height: 4200,
    pageWidthInches: 8.5,
    pageHeightInches: 14,
    dpi: 300,
  },
  renderScale: 0.32,
  fieldFontSize: 20,
  pdfDefaultFontSize: 10,
  pdfMinShrinkSize: 7,
  pdfShrinkStep: 0.5,
  lineHeightRatio: 1.2,
  defaultWrapMaxHeight: 120,
};

/** Tunable size for attendant-type radio check marks in PDF output (unit: inches). */
const ATTENDANT_RADIO_CHECK_MARK = {
  widthIn: 12 / 96,
  heightIn: 12 / 96,
  lineWidthIn: 0.024,
};

/** Extent factors for the two-segment check shape (matches line endpoint offsets). */
const RADIO_CHECK_SHAPE_EXTENT = { horizontal: 0.95, vertical: 0.7 };

// Field position coordinates (layout pixels)
const FIELD_POSITIONS = {
  province: { x: 600, y: 447 },
  city_municipality: { x: 600, y: 519 },
  registry_no: { x: 1634, y: 477 },
  child_name_first: { x: 531, y: 648, width: 531 },
  child_name_middle: { x: 1179, y: 648, width: 543 },
  child_name_last: { x: 1830, y: 648, width: 567 },
  sex: { x: 600, y: 753 },
  date_of_birth_day: { x: 1380, y: 753 },
  date_of_birth_month: { x: 1722, y: 753 },
  date_of_birth_year: { x: 2124, y: 753 },
  place_of_birth_hospital: { x: 576, y: 885 },
  place_of_birth_city: { x: 1470, y: 885 },
  place_of_birth_province: { x: 1872, y: 885 },
  type_of_birth: { x: 456, y: 1038 },
  multiple_birth_order: { x: 1056, y: 1038 },
  birth_order: { x: 1725, y: 1038 },
  weight_at_birth: { x: 2124, y: 1038 },
  mother_maiden_first: { x: 531, y: 1167, width: 531 },
  mother_maiden_middle: { x: 1179, y: 1167, width: 543 },
  mother_maiden_last: { x: 1830, y: 1167, width: 567 },
  mother_citizenship: { x: 543, y: 1275 },
  mother_religion: { x: 1557, y: 1275, width: 663 },
  mother_children_born_alive: { x: 459, y: 1440 },
  mother_children_living: { x: 786, y: 1440 },
  mother_children_dead: { x: 1056, y: 1440 },
  mother_occupation: { x: 1392, y: 1440, width: 639 },
  mother_age: { x: 2175, y: 1440 },
  mother_residence_house: { x: 336, y: 1557, width: 774 },
  mother_residence_city: { x: 1215, y: 1557, width: 330 },
  mother_residence_province: { x: 1605, y: 1557, width: 375 },
  mother_country: { x: 2070, y: 1557, width: 315 },
  father_name_first: { x: 531, y: 1677, width: 531 },
  father_name_middle: { x: 1179, y: 1677, width: 543 },
  father_name_last: { x: 1830, y: 1677, width: 567 },
  father_citizenship: { x: 336, y: 1818 },
  father_religion: { x: 900, y: 1818 },
  father_occupation: { x: 1509, y: 1818, width: 510 },
  father_age: { x: 2175, y: 1818 },
  father_residence_house: { x: 336, y: 1959, width: 774 },
  father_residence_city: { x: 1215, y: 1959, width: 330 },
  father_residence_province: { x: 1605, y: 1959, width: 375 },
  father_country: { x: 2070, y: 1959, width: 315 },
  marriage_date_month: { x: 507, y: 2148, width: 389 },
  marriage_date_day: { x: 696, y: 2148 },
  marriage_date_year: { x: 873, y: 2148 },
  marriage_place_city: { x: 1239, y: 2148, width: 378 },
  marriage_place_province: { x: 1667, y: 2148, width: 397 },
  marriage_place_country: { x: 2112, y: 2148, width: 342 },
  // Attendant type radio button positions
  attendant_radio_physician: { x: 282, y: 2277 },
  attendant_radio_nurse: { x: 600, y: 2277 },
  attendant_radio_midwife: { x: 875, y: 2277 },
  attendant_radio_hilot: { x: 1179, y: 2277 },
  attendant_radio_other: { x: 1794, y: 2277 },
  attendant_type_specify: { x: 2148, y: 2277, width: 249 },
  attendant_title: { x: 507, y: 2643 },
  attendant_name: { x: 483, y: 2562, width: 780 },
  attendant_address: { x: 1500, y: 2505, width: 905 },
  attendant_date: { x: 1512, y: 2643 },
  attendant_time: { x: 1533, y: 2409 },
  attendant_signature: { x: 471, y: 2490, width: 982 },
  informant_signature: { x: 483, y: 2916, width: 768 },
  informant_relation: { x: 612, y: 3000 },
  informant_address: { x: 399, y: 3057, width: 864 },
  informant_date: { x: 519, y: 3129 },
  received_by: { x: 519, y: 3306 },
  received_by_title: { x: 519, y: 3375 },
  received_by_date: { x: 519, y: 3447 },
  prepared_by: { x: 1665, y: 2928 },
  prepared_by_title: { x: 1665, y: 3000 },
  prepared_by_date: { x: 1665, y: 3069 },
  registered_by: { x: 1665, y: 3306 },
  registered_by_title: { x: 1665, y: 3375 },
  registered_by_date: { x: 1665, y: 3447 },
  remarks: { x: 234, y: 3588, width: 2292, height: 210 },
  ...REGISTRAR_BOX_FIELD_POSITIONS,
};

/** Space between form columns to prevent text bleeding into next box */
const PDF_COLUMN_GUTTER_PX = 20;

/** Multi-column form rows for inferring column width */
const PDF_MULTI_COLUMN_ROWS = [
  ['child_name_first', 'child_name_middle', 'child_name_last'],
  ['sex', 'date_of_birth_day', 'date_of_birth_month', 'date_of_birth_year'],
  ['place_of_birth_hospital', 'place_of_birth_city', 'place_of_birth_province'],
  ['type_of_birth', 'multiple_birth_order', 'birth_order', 'weight_at_birth'],
  ['mother_maiden_first', 'mother_maiden_middle', 'mother_maiden_last'],
  ['mother_citizenship', 'mother_religion'],
  ['mother_children_born_alive', 'mother_children_living', 'mother_children_dead', 'mother_occupation', 'mother_age'],
  ['mother_residence_house', 'mother_residence_city', 'mother_residence_province', 'mother_country'],
  ['father_citizenship', 'father_religion', 'father_occupation', 'father_age'],
  ['father_residence_house', 'father_residence_city', 'father_residence_province', 'father_country'],
  ['marriage_date_month', 'marriage_date_day', 'marriage_date_year', 'marriage_place_city', 'marriage_place_province', 'marriage_place_country'],
  ['informant_signature', 'informant_relation'],
  ['prepared_by', 'received_by', 'registered_by'],
];

/** Single fields with max width from x to logical right edge */
const PDF_FIELD_MAX_WIDTH_TO_X = {
  informant_address: PDF_LAYOUT.document.width,
  informant_relation: PDF_LAYOUT.document.width,
  attendant_address: PDF_LAYOUT.document.width,
  attendant_name: 1500,
  attendant_title: 1512,
  attendant_date: PDF_LAYOUT.document.width,
  attendant_time: PDF_LAYOUT.document.width,
};

/** Fields that display centered text */
const CENTERED_FIELD_KEYS = [
  'child_name_first', 'child_name_middle', 'child_name_last',
  'sex',
  'date_of_birth_day', 'date_of_birth_month', 'date_of_birth_year',
  'place_of_birth_hospital', 'place_of_birth_city', 'place_of_birth_province',
  'type_of_birth', 'multiple_birth_order', 'birth_order', 'weight_at_birth',
  'mother_maiden_first', 'mother_maiden_middle', 'mother_maiden_last',
  'mother_children_born_alive', 'mother_children_living', 'mother_children_dead',
  'mother_occupation',
  'mother_residence_house', 'mother_residence_city', 'mother_residence_province',
  'mother_country',
  'father_name_first', 'father_name_middle', 'father_name_last',
  'father_occupation', 'father_age',
  'father_residence_house', 'father_residence_city', 'father_residence_province',
  'father_country',
  'marriage_date_month', 'marriage_date_day', 'marriage_date_year', 'marriage_place_city', 'marriage_place_province', 'marriage_place_country',
];

/** Fields requiring address abbreviation */
const ADDRESS_ABBREV_FIELD_KEYS = new Set([
  'place_of_birth_hospital',
  'marriage_place',
  'mother_residence_house',
  'father_residence_house',
  'attendant_address',
  'informant_address',
]);

/** Print styles injected into document */
const PRINT_STYLES_ID = 'field-position-print';

/** Compact address character threshold */
const INFORMANT_ADDRESS_COMPACT_LENGTH = 44;
const INFORMANT_ADDRESS_COMPACT_PDF_PT = 8;
const INFORMANT_ADDRESS_COMPACT_OVERLAY_PX =
  (INFORMANT_ADDRESS_COMPACT_PDF_PT / 10) * PDF_LAYOUT.fieldFontSize;

/** Attendant address shrinking threshold (characters) */
const ATTENDANT_ADDRESS_SHRINK_MIN_CHARS = 35;
const ATTENDANT_ADDRESS_SHRINK_MAX_CHARS = 60;
const ATTENDANT_ADDRESS_MIN_FONT_PX = 12;

/** Attendant address shrinking threshold for PDF (characters) */
const ATTENDANT_ADDRESS_SHRINK_MIN_CHARS_PDF = 35;
const ATTENDANT_ADDRESS_SHRINK_MAX_CHARS_PDF = 60;
const ATTENDANT_ADDRESS_MIN_FONT_PT = 9;

/** Attendant signature compact character threshold (like informant_address) */
const ATTENDANT_SIGNATURE_COMPACT_LENGTH = 40;
const ATTENDANT_SIGNATURE_COMPACT_PDF_PT = 8;
const ATTENDANT_SIGNATURE_MIN_FONT_PT = 8;
const ATTENDANT_SIGNATURE_COMPACT_OVERLAY_PX =
  (ATTENDANT_SIGNATURE_COMPACT_PDF_PT / 10) * PDF_LAYOUT.fieldFontSize;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert camelCase string to snake_case
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/**
 * Get value from merged data using camelCase key, falling back to snake_case
 */
function getMergedValue(merged, key) {
  return merged[key] ?? merged[camelToSnake(key)];
}

/**
 * Get effective column width in pixels for a field
 * @returns {number | null} width in layout px, or null if unconstrained
 */
function getEffectiveColumnWidthPx(fieldKey) {
  const field = FIELD_POSITIONS[fieldKey];
  if (!field) return null;
  if (field.width != null && field.width > 0) return field.width;

  const docWidth = PDF_LAYOUT.document.width;
  const y0 = field.y;
  for (const row of PDF_MULTI_COLUMN_ROWS) {
    const idx = row.indexOf(fieldKey);
    if (idx === -1) continue;
    const x0 = field.x;
    if (idx + 1 < row.length) {
      const nextField = FIELD_POSITIONS[row[idx + 1]];
      // Check if next field is on same row (similar y position)
      if (nextField && Math.abs(nextField.y - y0) < 50) {
        const x1 = nextField.x;
        return Math.max(48, x1 - x0 - PDF_COLUMN_GUTTER_PX);
      }
    }
    // Same row: use document edge
    // Different row alignment: use document edge for last item
    return Math.max(48, docWidth - x0 - PDF_COLUMN_GUTTER_PX);
  }

  const rightEdge = PDF_FIELD_MAX_WIDTH_TO_X[fieldKey];
  if (rightEdge != null) {
    return Math.max(48, rightEdge - field.x - PDF_COLUMN_GUTTER_PX);
  }
  return null;
}

/**
 * Abbreviate address text (Street → St., Barangay → Brgy.)
 */
function abbreviateAddressText(value) {
  if (!value) return '';
  const str = String(value);
  if (!str.trim()) return str;
  return str
    .replace(/\bSubdivision\b/gi, 'Subd.')
    .replace(/\bBuilding\b/gi, 'Bldg.')
    .replace(/\bApartment\b/gi, 'Apt.')
    .replace(/\bParkway\b/gi, 'Pkwy.')
    .replace(/\bHighway\b/gi, 'Hwy.')
    .replace(/\bAvenue\b/gi, 'Ave.')
    .replace(/\bRoad\b/gi, 'Rd.')
    .replace(/\bBarangay\b/gi, 'Brgy.')
    .replace(/\bPurok\b/gi, 'Prk.')
    .replace(/\bStreet\b/gi, 'St.')
    .replace(/\bBlock\b/gi, 'Blk.')
    .replace(/\bLane\b/gi, 'Ln.')
    .replace(/\bLot\b/gi, 'Lt.');
}

/**
 * Convert value to Certificate of Live Birth display format (uppercase)
 */
function toCobDisplay(value) {
  if (!value) return '';
  return String(value).toUpperCase();
}

/**
 * Parse date string into day, month, year components
 */
function parseDateOfBirth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { day: '', month: '', year: '' };
  }
  const trimmed = dateStr.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    return { day: isoMatch[3], month: isoMatch[2], year: isoMatch[1] };
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { day: '', month: '', year: '' };
  }
  return {
    day: String(date.getDate()),
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
  };
}

/**
 * Convert country code to display name
 */
function countryDisplayFromCodeOrText(codeOrText) {
  if (!codeOrText || typeof codeOrText !== 'string') return '';
  const text = codeOrText.trim();
  let out = text;
  if (text.length === 2 && /^[A-Za-z]{2}$/.test(text)) {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const name = displayNames.of(text.toUpperCase());
      if (name && name !== text.toUpperCase()) out = name;
    } catch (_) { /* ignore */ }
  }
  return String(out).toUpperCase();
}

/**
 * Join time parts with separator
 */
function joinTimeParts(time, ampm) {
  return [time, ampm].filter(Boolean).join(' ');
}

/**
 * Get signature value with fallback to name
 */
function getSignatureOrName(signature, name) {
  return signature || name;
}

/**
 * Normalize attendant type value for comparison
 */
function normalizeAttendantType(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().trim();
  if (normalized === 'physician' || normalized === 'md' || normalized === 'doctor') {
    return 'physician';
  }
  if (normalized === 'nurse' || normalized === 'rn') {
    return 'nurse';
  }
  if (normalized === 'midwife') {
    return 'midwife';
  }
  if (normalized === 'hilot' || normalized === 'traditional birth attendant' || normalized === 'tba' || normalized.includes('hilot')) {
    return 'hilot';
  }
  if (normalized === 'other' || normalized === 'others') {
    return 'other';
  }
  return normalized;
}

// ============================================================================
// FIELD VALUE MAPPING
// ============================================================================

/**
 * Map layout field keys to how to get the value (cert key or function)
 */
const FIELD_VALUE_MAP = [
  { key: 'province', valueKey: 'province' },
  { key: 'city_municipality', valueKey: 'cityMunicipality' },
  { key: 'registry_no', valueKey: 'registryNo' },
  { key: 'child_name_first', valueKey: 'childFirst' },
  { key: 'child_name_middle', valueKey: 'childMiddle' },
  { key: 'child_name_last', valueKey: 'childLast' },
  { key: 'sex', valueKey: 'sex' },
  { key: 'date_of_birth_day', valueKey: 'birthDay' },
  { key: 'date_of_birth_month', valueKey: 'birthMonth' },
  { key: 'date_of_birth_year', valueKey: 'birthYear' },
  { key: 'place_of_birth_hospital', valueKey: 'placeOfBirthName' },
  { key: 'place_of_birth_city', valueKey: 'placeOfBirthCity' },
  { key: 'place_of_birth_province', valueKey: 'placeOfBirthProvince' },
  { key: 'type_of_birth', valueKey: 'typeOfBirth' },
  { key: 'multiple_birth_order', valueKey: 'multipleBirthOrder' },
  { key: 'birth_order', valueKey: 'birthOrder' },
  { key: 'weight_at_birth', valueKey: 'weightGrams' },
  { key: 'mother_maiden_first', valueKey: 'motherFirst' },
  { key: 'mother_maiden_middle', valueKey: 'motherMiddle' },
  { key: 'mother_maiden_last', valueKey: 'motherLast' },
  { key: 'mother_citizenship', valueKey: 'motherCitizenship' },
  { key: 'mother_religion', valueKey: 'motherReligion' },
  { key: 'mother_children_born_alive', valueKey: 'motherChildrenBornAlive' },
  { key: 'mother_children_living', valueKey: 'motherChildrenLiving' },
  { key: 'mother_children_dead', valueKey: 'motherChildrenDead' },
  { key: 'mother_occupation', valueKey: 'motherOccupation' },
  { key: 'mother_age', valueKey: 'motherAge' },
  { key: 'mother_residence_house', valueKey: 'motherResidenceLine1' },
  { key: 'mother_residence_city', valueKey: 'motherResidenceCity' },
  { key: 'mother_residence_province', valueKey: 'motherResidenceProvince' },
  { key: 'mother_country', valueKey: 'motherCountry' },
  { key: 'father_name_first', valueKey: 'fatherFirst' },
  { key: 'father_name_middle', valueKey: 'fatherMiddle' },
  { key: 'father_name_last', valueKey: 'fatherLast' },
  { key: 'father_citizenship', valueKey: 'fatherCitizenship' },
  { key: 'father_religion', valueKey: 'fatherReligion' },
  { key: 'father_occupation', valueKey: 'fatherOccupation' },
  { key: 'father_age', valueKey: 'fatherAge' },
  { key: 'father_residence_house', valueKey: 'fatherResidenceLine1' },
  { key: 'father_residence_city', valueKey: 'fatherResidenceCity' },
  { key: 'father_residence_province', valueKey: 'fatherResidenceProvince' },
  { key: 'father_country', valueKey: 'fatherCountry' },
  { key: 'marriage_date_month', valueKey: 'marriageMonth' },
  { key: 'marriage_date_day', valueKey: 'marriageDay' },
  { key: 'marriage_date_year', valueKey: 'marriageYear' },
  { key: 'marriage_place_city', valueKey: 'marriagePlaceCity' },
  { key: 'marriage_place_province', valueKey: 'marriagePlaceProvince' },
  { key: 'marriage_place_country', valueKey: 'marriagePlaceCountry' },
  { key: 'attendant_type_specify', getValue: (getVal) => getVal('attendantTypeSpecify') ?? getVal('attendantOthersSpecify') ?? '' },
  { key: 'attendant_title', valueKey: 'attendantTitle' },
  { key: 'attendant_name', valueKey: 'attendantName' },
  { key: 'attendant_signature', getValue: (getVal) => getSignatureOrName(getVal('attendantSignature'), getVal('attendantName')) },
  { key: 'attendant_address', valueKey: 'attendantAddress' },
  { key: 'attendant_date', valueKey: 'attendantDate' },
  { key: 'attendant_time', getValue: (getVal) => joinTimeParts(getVal('attendantTime'), getVal('attendantAmpm')) },
  { key: 'informant_signature', getValue: (getVal) => getSignatureOrName(getVal('informantSignature'), getVal('informantName')) },
  { key: 'informant_relation', valueKey: 'informantRelationship' },
  { key: 'informant_address', valueKey: 'informantAddress' },
  { key: 'informant_date', valueKey: 'informantDate' },
  { key: 'prepared_by', getValue: (getVal) => getSignatureOrName(getVal('preparedBySignature'), getVal('preparedByName')) },
  { key: 'prepared_by_title', valueKey: 'preparedByTitle' },
  { key: 'prepared_by_date', valueKey: 'preparedByDate' },
  { key: 'received_by', getValue: (getVal) => getSignatureOrName(getVal('receivedBySignature'), getVal('receivedByName')) },
  { key: 'received_by_title', valueKey: 'receivedByTitle' },
  { key: 'received_by_date', valueKey: 'receivedByDate' },
  { key: 'registered_by', getValue: (getVal) => getSignatureOrName(getVal('registeredBySignature'), getVal('registeredByName')) },
  { key: 'registered_by_title', valueKey: 'registeredByTitle' },
  { key: 'registered_by_date', valueKey: 'registeredByDate' },
  { key: 'remarks', valueKey: 'remarks' },
  ...REGISTRAR_BOX_VALUE_MAP,
];

// ============================================================================
// MERGED DATA BUILDER (SRP - Single Responsibility Principle)
// ============================================================================

/**
 * Merge child and certificate data into a unified object
 * Handles both camelCase and snake_case key variations
 */
function buildMergedCertData(child, cert) {
  if (!cert || typeof cert !== 'object') return {};

  const birth = child?.date_of_birth ? parseDateOfBirth(child.date_of_birth) : {};
  const resMother = cert.motherResidenceCountry ?? cert.mother_residence_country ?? '';
  const resFather = cert.fatherResidenceCountry ?? cert.father_residence_country ?? '';

  const mc =
    (cert.motherCountry && String(cert.motherCountry).trim()) ||
    (cert.mother_country && String(cert.mother_country).trim()) ||
    countryDisplayFromCodeOrText(resMother);

  const fc =
    (cert.fatherCountry && String(cert.fatherCountry).trim()) ||
    (cert.father_country && String(cert.father_country).trim()) ||
    countryDisplayFromCodeOrText(resFather);

  const marriageCountry =
    (cert.marriagePlaceCountry && String(cert.marriagePlaceCountry).trim()) ||
    (cert.marriage_place_country && String(cert.marriage_place_country).trim()) ||
    '';

  return {
    ...cert,
    childFirst: cert.childFirst ?? cert.child_first ?? child?.first_name ?? '',
    childMiddle: cert.childMiddle ?? cert.child_middle ?? child?.middle_name ?? '',
    childLast: cert.childLast ?? cert.child_last ?? child?.last_name ?? '',
    birthDay: cert.birthDay ?? cert.birth_day ?? birth.day ?? '',
    birthMonth: cert.birthMonth ?? cert.birth_month ?? birth.month ?? '',
    birthYear: cert.birthYear ?? cert.birth_year ?? birth.year ?? '',
    motherCountry: String(mc || '').trim().toUpperCase(),
    fatherCountry: String(fc || '').trim().toUpperCase(),
    marriagePlaceCountry: String(marriageCountry || '').trim().toUpperCase(),
  };
}

// ============================================================================
// PDF UTILITIES (OCP - Open/Closed Principle, extensibility for future)
// ============================================================================

/**
 * Pick optimal PDF font size to fit content in column
 */
function pickPdfFontPtForColumn(doc, line, maxWidthIn, preferredPt) {
  if (!maxWidthIn || maxWidthIn <= 0) return preferredPt;
  const text = line == null ? '' : String(line);
  if (!text.trim()) return preferredPt;

  const lineCountAt = (pt) => {
    doc.setFontSize(pt);
    try {
      if (typeof doc.splitTextToSize === 'function') {
        return doc.splitTextToSize(text, maxWidthIn).length;
      }
    } catch (_) { /* ignore */ }
    return 1;
  };

  let minLines = Infinity;
  let bestPt = preferredPt;
  for (let pt = preferredPt; pt >= PDF_LAYOUT.pdfMinShrinkSize; pt -= PDF_LAYOUT.pdfShrinkStep) {
    const count = lineCountAt(pt);
    if (count < minLines) {
      minLines = count;
      bestPt = pt;
    } else if (count === minLines) {
      bestPt = Math.max(bestPt, pt);
    }
  }
  doc.setFontSize(bestPt);
  return bestPt;
}

/**
 * Generate PDF filename suggestion
 */
function buildPdfFilename(child, cert) {
  const merged = buildMergedCertData(child, cert);
  const parts = [merged.childFirst, merged.childMiddle, merged.childLast].filter(
    (p) => p && String(p).trim()
  );
  const rawName = parts.join(' ');
  const sanitized = rawName
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150) || 'Applicant';
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${sanitized}-${dateStr}.pdf`;
}

/**
 * Convert base64 to blob URL
 */
function base64ToBlobUrl(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}


function drawRadioMark(doc, x, y) {
  const { widthIn, heightIn, lineWidthIn } = ATTENDANT_RADIO_CHECK_MARK;
  const wX = widthIn / RADIO_CHECK_SHAPE_EXTENT.horizontal;
  const wY = heightIn / RADIO_CHECK_SHAPE_EXTENT.vertical;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidthIn);
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.line(x - wX * 0.4, y + wY * 0.32, x - wX * 0.02, y + wY * 0.42);
  doc.line(x - wX * 0.02, y + wY * 0.42, x + wX * 0.55, y - wY * 0.28);
}

/**
 * Build PDF as base64 data URI
 */
function buildFieldPositionPdfBase64(merged) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'legal' });
  doc.setFont('helvetica');
  doc.setFontSize(PDF_LAYOUT.pdfDefaultFontSize);
  doc.setTextColor(0, 0, 0);

  const { width: docWidth, height: docHeight, pageWidthInches, pageHeightInches } = PDF_LAYOUT.document;

  // Get attendant type for radio button logic
  const attendantType = normalizeAttendantType(merged.attendantType ?? merged.attendant_type);

  for (const item of FIELD_VALUE_MAP) {
    const field = FIELD_POSITIONS[item.key];
    if (!field) continue;

    const getVal = (key) => getMergedValue(merged, key);
    const raw = item.getValue ? item.getValue(getVal) : getVal(item.valueKey);
    const rawTrimLen = String(raw ?? '').trim().length;

    let fontPt = PDF_LAYOUT.pdfDefaultFontSize;
    if (item.key === 'informant_address' && rawTrimLen >= INFORMANT_ADDRESS_COMPACT_LENGTH) {
      fontPt = INFORMANT_ADDRESS_COMPACT_PDF_PT;
    } else if (item.key === 'weight_at_birth') {
      fontPt = 9;
    } else if (item.key === 'attendant_address') {
      fontPt = getAttendantAddressFontPt(rawTrimLen);
    } else if (item.key === 'attendant_signature' && rawTrimLen >= ATTENDANT_SIGNATURE_COMPACT_LENGTH) {
      fontPt = ATTENDANT_SIGNATURE_COMPACT_PDF_PT;
    }
    doc.setFontSize(fontPt);
    const defaultLineHeightIn = (fontPt * PDF_LAYOUT.lineHeightRatio) / 72;

    const value = ADDRESS_ABBREV_FIELD_KEYS.has(item.key) ? abbreviateAddressText(raw) : raw;
    const str = toCobDisplay(value);
    const xIn = (field.x / docWidth) * pageWidthInches;
    let yIn = ((field.y + 25) / docHeight) * pageHeightInches;
    const widthPx = getEffectiveColumnWidthPx(item.key);
    const maxWidthIn = widthPx != null && widthPx > 0 ? (widthPx / docWidth) * pageWidthInches : null;
    const inputLines = str.split(/\r?\n/);

    for (let i = 0; i < inputLines.length; i++) {
      const line = inputLines[i];
      if (maxWidthIn != null && maxWidthIn > 0) {
        const chosenPt = pickPdfFontPtForColumn(doc, line, maxWidthIn, fontPt);
        doc.setFontSize(chosenPt);
        const lineHeightIn = (chosenPt * PDF_LAYOUT.lineHeightRatio) / 72;
        const opts = { maxWidth: maxWidthIn };
        doc.text(line, xIn, yIn, opts);
        let lineHeightUsed = lineHeightIn;
        if (typeof doc.getTextDimensions === 'function') {
          try {
            const dims = doc.getTextDimensions(line, opts);
            if (dims && typeof dims.h === 'number' && dims.h > 0) {
              lineHeightUsed = dims.h;
            }
          } catch (_) { /* ignore */ }
        }
        yIn += lineHeightUsed;
      } else {
        doc.setFontSize(fontPt);
        doc.text(line, xIn, yIn);
        yIn += defaultLineHeightIn;
      }
    }
  }

  // Draw attendant type radio button marks
  const radioPositions = {
    physician: { x: 282, y: 2277 },
    nurse: { x: 600, y: 2277 },
    midwife: { x: 875, y: 2277 },
    hilot: { x: 1179, y: 2277 },
    other: { x: 1794, y: 2277 },
  };

  if (attendantType && radioPositions[attendantType]) {
    const pos = radioPositions[attendantType];
    const xIn = (pos.x / docWidth) * pageWidthInches;
    const yIn = ((pos.y + 10) / docHeight) * pageHeightInches;
    drawRadioMark(doc, xIn, yIn);
  }

  // Draw "other" specify text if applicable
  if (attendantType === 'other') {
    const specifyField = FIELD_POSITIONS['attendant_type_specify'];
    if (specifyField) {
      const specifyValue = merged.attendantTypeSpecify ?? merged.attendantOthersSpecify ?? merged.attendant_type_specify ?? '';
      if (specifyValue) {
        const xIn = (specifyField.x / docWidth) * pageWidthInches;
        const yIn = ((specifyField.y + 25) / docHeight) * pageHeightInches;
        doc.setFontSize(PDF_LAYOUT.pdfDefaultFontSize);
        doc.text(toCobDisplay(specifyValue), xIn, yIn);
      }
    }
  }

  const dataUri = doc.output('datauristring');
  return dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] : '';
}

/**
 * Get attendant address font size for PDF based on character count
 */
function getAttendantAddressFontPt(charCount) {
  if (charCount < ATTENDANT_ADDRESS_SHRINK_MIN_CHARS_PDF) {
    return PDF_LAYOUT.pdfDefaultFontSize;
  }
  if (charCount > ATTENDANT_ADDRESS_SHRINK_MAX_CHARS_PDF) {
    return ATTENDANT_ADDRESS_MIN_FONT_PT;
  }
  // Linear interpolation between min and max chars
  const range = ATTENDANT_ADDRESS_SHRINK_MAX_CHARS_PDF - ATTENDANT_ADDRESS_SHRINK_MIN_CHARS_PDF;
  const position = charCount - ATTENDANT_ADDRESS_SHRINK_MIN_CHARS_PDF;
  const fontRange = PDF_LAYOUT.pdfDefaultFontSize - ATTENDANT_ADDRESS_MIN_FONT_PT;
  return PDF_LAYOUT.pdfDefaultFontSize - (position / range) * fontRange;
}

/**
 * Get attendant address font size for overlay based on character count
 */
function getAttendantAddressFontPx(charCount) {
  if (charCount < ATTENDANT_ADDRESS_SHRINK_MIN_CHARS) {
    return PDF_LAYOUT.fieldFontSize;
  }
  if (charCount > ATTENDANT_ADDRESS_SHRINK_MAX_CHARS) {
    return ATTENDANT_ADDRESS_MIN_FONT_PX;
  }
  // Linear interpolation between min and max chars
  const range = ATTENDANT_ADDRESS_SHRINK_MAX_CHARS - ATTENDANT_ADDRESS_SHRINK_MIN_CHARS;
  const position = charCount - ATTENDANT_ADDRESS_SHRINK_MIN_CHARS;
  const fontRange = PDF_LAYOUT.fieldFontSize - ATTENDANT_ADDRESS_MIN_FONT_PX;
  return PDF_LAYOUT.fieldFontSize - (position / range) * fontRange;
}

/**
 * Build a combined PDF with field positioning AND requirements checklist with checkmarks
 */
function buildCombinedPdfBase64(merged) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'legal' });
  doc.setFont('helvetica');
  doc.setFontSize(PDF_LAYOUT.pdfDefaultFontSize);
  doc.setTextColor(0, 0, 0);

  const { width: docWidth, height: docHeight, pageWidthInches, pageHeightInches } = PDF_LAYOUT.document;

  // Get attendant type for radio button logic
  const attendantType = normalizeAttendantType(merged.attendantType ?? merged.attendant_type);

  // Draw the field position form (same as original function)
  for (const item of FIELD_VALUE_MAP) {
    const field = FIELD_POSITIONS[item.key];
    if (!field) continue;

    const getVal = (key) => getMergedValue(merged, key);
    const raw = item.getValue ? item.getValue(getVal) : getVal(item.valueKey);
    const rawTrimLen = String(raw ?? '').trim().length;

    let fontPt = PDF_LAYOUT.pdfDefaultFontSize;
    if (item.key === 'informant_address' && rawTrimLen >= INFORMANT_ADDRESS_COMPACT_LENGTH) {
      fontPt = INFORMANT_ADDRESS_COMPACT_PDF_PT;
    } else if (item.key === 'weight_at_birth') {
      fontPt = 9;
    } else if (item.key === 'attendant_address') {
      fontPt = getAttendantAddressFontPt(rawTrimLen);
    } else if (item.key === 'attendant_signature' && rawTrimLen >= ATTENDANT_SIGNATURE_COMPACT_LENGTH) {
      fontPt = ATTENDANT_SIGNATURE_COMPACT_PDF_PT;
    }
    doc.setFontSize(fontPt);
    const defaultLineHeightIn = (fontPt * PDF_LAYOUT.lineHeightRatio) / 72;

    const value = ADDRESS_ABBREV_FIELD_KEYS.has(item.key) ? abbreviateAddressText(raw) : raw;
    const str = toCobDisplay(value);
    const xIn = (field.x / docWidth) * pageWidthInches;
    let yIn = ((field.y + 25) / docHeight) * pageHeightInches;
    const widthPx = getEffectiveColumnWidthPx(item.key);
    const maxWidthIn = widthPx != null && widthPx > 0 ? (widthPx / docWidth) * pageWidthInches : null;
    const inputLines = str.split(/\r?\n/);

    for (let i = 0; i < inputLines.length; i++) {
      const line = inputLines[i];
      if (maxWidthIn != null && maxWidthIn > 0) {
        const chosenPt = pickPdfFontPtForColumn(doc, line, maxWidthIn, fontPt);
        doc.setFontSize(chosenPt);
        const lineHeightIn = (chosenPt * PDF_LAYOUT.lineHeightRatio) / 72;
        const opts = { maxWidth: maxWidthIn };
        doc.text(line, xIn, yIn, opts);
        let lineHeightUsed = lineHeightIn;
        if (typeof doc.getTextDimensions === 'function') {
          try {
            const dims = doc.getTextDimensions(line, opts);
            if (dims && typeof dims.h === 'number' && dims.h > 0) {
              lineHeightUsed = dims.h;
            }
          } catch (_) { /* ignore */ }
        }
        yIn += lineHeightUsed;
      } else {
        doc.setFontSize(fontPt);
        doc.text(line, xIn, yIn);
        yIn += defaultLineHeightIn;
      }
    }
  }

  // Draw attendant type radio button marks
  const radioPositions = {
    physician: { x: 282, y: 2277 },
    nurse: { x: 600, y: 2277 },
    midwife: { x: 875, y: 2277 },
    hilot: { x: 1179, y: 2277 },
    other: { x: 1794, y: 2277 },
  };

  if (attendantType && radioPositions[attendantType]) {
    const pos = radioPositions[attendantType];
    const xIn = (pos.x / docWidth) * pageWidthInches;
    const yIn = ((pos.y + 10) / docHeight) * pageHeightInches;
    drawRadioMark(doc, xIn, yIn);
  }

  // Draw "other" specify text if applicable
  if (attendantType === 'other') {
    const specifyField = FIELD_POSITIONS['attendant_type_specify'];
    if (specifyField) {
      const specifyValue = merged.attendantTypeSpecify ?? merged.attendantOthersSpecify ?? merged.attendant_type_specify ?? '';
      if (specifyValue) {
        const xIn = (specifyField.x / docWidth) * pageWidthInches;
        const yIn = ((specifyField.y + 25) / docHeight) * pageHeightInches;
        doc.setFontSize(PDF_LAYOUT.pdfDefaultFontSize);
        doc.text(toCobDisplay(specifyValue), xIn, yIn);
      }
    }
  }

  // Add a requirements checklist table with checkmarks below the form
  // Add some space after the form
  const checklistStartY = 12; // Start checklist at 12 inches from top

  // Add checklist title
  doc.setFontSize(14);
  doc.text('Document Requirements Checklist', 0.5, checklistStartY);

  // Add child info
  doc.setFontSize(10);
  const childName = `${merged.childFirst || ''} ${merged.childMiddle || ''} ${merged.childLast || ''}`.trim();
  doc.text(`Applicant: ${childName}`, 0.5, checklistStartY + 0.3);
  doc.text(`Date of Birth: ${merged.birthMonth || ''}/${merged.birthDay || ''}/${merged.birthYear || ''}`, 0.5, checklistStartY + 0.5);

  // Sample requirements data with checkmarks
  const requirementsData = [
    { requirement: 'Birth Certificate', status: true, priority: 'High' },
    { requirement: 'Parent IDs', status: false, priority: 'High' },
    { requirement: 'Marriage Contract', status: true, priority: 'Medium' },
    { requirement: 'Medical Certificate', status: false, priority: 'Low' },
    { requirement: 'Affidavit', status: true, priority: 'Medium' },
    { requirement: 'School Records', status: false, priority: 'Low' }
  ];

  const columns = [
    { header: 'Requirement', key: 'requirement' },
    { header: 'Priority', key: 'priority' },
    { header: 'Status', key: 'status' }
  ];

  // Configure checkmark column with conditional styling
  const checkmarkColumns = {
    status: {
      style: 'unicode',
      size: 'large',
      color: 'success',
      cellStyle: {
        halign: 'center',
        valign: 'middle',
        cellWidth: 0.8
      }
    }
  };

  // Generate the table with checkmarks using our utility
  generateTableWithCheckmarks(doc, requirementsData, columns, {
    startY: checklistStartY + 0.8,
    margin: { top: 0.5, right: 0.5, left: 0.5, bottom: 0.5 }
  }, checkmarkColumns);

  const dataUri = doc.output('datauristring');
  return dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] : '';
}

/**
 * Radio button mark component for attendant type selection
 */
function RadioMark({ x, y, show }) {
  return (
    <span
      className="absolute"
      style={{
        left: x,
        top: y,
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: COLORS.black,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {show ? '✓' : ''}
    </span>
  );
}

/**
 * Hook to manage PDF preview URL state
 */
function usePdfPreviewUrl() {
  const [url, setUrl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPreview = useCallback((base64) => {
    const blobUrl = base64ToBlobUrl(base64);
    setUrl(blobUrl);
    setIsOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    // Clean up blob URL
    if (url) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
  }, [url]);

  return { url, isOpen, openPreview, closePreview };
}

/**
 * Hook to inject print styles into document
 */
function usePrintStyles() {
  useEffect(() => {
    const styleId = PRINT_STYLES_ID;
    let styleEl = document.getElementById(styleId);

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.type = 'text/css';
      styleEl.textContent = `
        @media print {
          .print-hide { display: none !important; }
          .field-position-print-wrapper { width: 100% !important; }
          .field-position-print-area { box-shadow: none !important; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    return () => {
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
}

/**
 * Generate table with checkmarks using jsPDF
 */
function generateTableWithCheckmarks(doc, data, columns, options = {}, checkmarkColumns = {}) {
  const { startY = 0, margin = {} } = options;
  const { top = 0, right = 0, bottom = 0, left = 0 } = margin;

  // Set up table styling
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Calculate column widths
  const pageWidth = doc.internal.pageSize.width;
  const usableWidth = pageWidth - left - right;
  const colCount = columns.length;
  const colWidth = usableWidth / colCount;

  // Draw table headers
  let currentY = startY;
  doc.setFont(undefined, 'bold');
  columns.forEach((col, index) => {
    const x = left + (index * colWidth);
    doc.text(col.header, x + 2, currentY + 4);
    // Draw header bottom border
    doc.setLineWidth(0.5);
    doc.line(x, currentY + 6, x + colWidth, currentY + 6);
  });
  doc.setFont(undefined, 'normal');
  currentY += 8;

  // Draw table rows
  data.forEach((row, rowIndex) => {
    const rowY = currentY;

    columns.forEach((col, colIndex) => {
      const x = left + (colIndex * colWidth);
      const value = row[col.key];

      // Handle checkmark columns
      if (checkmarkColumns[col.key] && typeof value === 'boolean') {
        const checkmarkConfig = checkmarkColumns[col.key];
        const checkmarkText = value ? '✓' : '✗';
        const checkmarkColor = value ? [0, 128, 0] : [255, 0, 0]; // Green for true, red for false

        doc.setTextColor(...checkmarkColor);
        doc.text(checkmarkText, x + colWidth / 2, currentY + 4, { align: 'center' });
      } else {
        // Regular text column
        doc.setTextColor(0, 0, 0);
        const text = String(value || '');
        doc.text(text, x + 2, currentY + 4);
      }

      // Draw cell borders
      doc.setLineWidth(0.3);
      doc.rect(x, currentY, colWidth, 8);
    });

    currentY += 8;
  });

  // Draw table bottom border
  doc.setLineWidth(0.5);
  doc.line(left, currentY, left + usableWidth, currentY);
}

function PositionedValue({ fieldKey, value, fontLenSource }) {
  const field = FIELD_POSITIONS[fieldKey];
  if (!field) return null;

  const display = toCobDisplay(value);
  const lenForFont =
    fieldKey === 'informant_address' && fontLenSource != null
      ? String(fontLenSource).trim().length
      : String(value ?? '').trim().length;

  const isCentered = CENTERED_FIELD_KEYS.includes(fieldKey);
  const colW = getEffectiveColumnWidthPx(fieldKey);
  const boxWidth = field.width ?? colW ?? undefined;

  let fontPx = PDF_LAYOUT.fieldFontSize;
  if (fieldKey === 'informant_address' && lenForFont >= INFORMANT_ADDRESS_COMPACT_LENGTH) {
    fontPx = INFORMANT_ADDRESS_COMPACT_OVERLAY_PX;
  } else if (fieldKey === 'attendant_address') {
    fontPx = getAttendantAddressFontPx(lenForFont);
  } else if (fieldKey === 'attendant_signature' && lenForFont >= ATTENDANT_SIGNATURE_COMPACT_LENGTH) {
    fontPx = ATTENDANT_SIGNATURE_COMPACT_OVERLAY_PX;
  }
  const useWrap = boxWidth != null;

  return (
    <span
      className="absolute overflow-hidden"
      style={{
        left: field.x,
        top: field.y,
        width: boxWidth,
        height: field.height,
        maxHeight: field.height == null && useWrap ? PDF_LAYOUT.defaultWrapMaxHeight : undefined,
        fontFamily: FONT_FAMILY,
        fontSize: `${fontPx}px`,
        padding: '2px 4px',
        color: COLORS.black,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        ...(isCentered && { textAlign: 'center' }),
        ...(useWrap && {
          display: 'block',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.15,
        }),
      }}
    >
      {display}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FieldPosition() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [child, setChild] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { url: pdfPreviewUrl, isOpen: pdfPreviewOpen, openPreview, closePreview } = usePdfPreviewUrl();
  usePrintStyles();

  useEffect(() => {
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const raw = data.certificate_of_live_birth;
        setCert(raw && typeof raw === 'object' ? raw : {});
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const handlePreviewPdf = useCallback(() => {
    const merged = buildMergedCertData(child, cert);
    const base64 = buildFieldPositionPdfBase64(merged);
    if (!base64) {
      toast.error('Could not generate PDF.');
      return;
    }
    openPreview(base64);
  }, [child, cert, openPreview]);

  const handleSavePdf = useCallback(async () => {
    if (!window.electron?.saveFieldPositionPdf) return;
    try {
      const merged = buildMergedCertData(child, cert);
      const base64 = buildFieldPositionPdfBase64(merged);
      const suggestedFilename = buildPdfFilename(child, cert);
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (notifyElectronSavePdfResult(result)) {
        onPdfSavedOpenInBrowser(result.filePath, 'PDF');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save PDF.');
    }
  }, [child, cert]);

  /**
   * Generate a combined PDF with field positioning AND requirements checklist with checkmarks
   */
  const handleSaveCombinedPdf = useCallback(async () => {
    if (!window.electron?.saveFieldPositionPdf) return;
    try {
      const merged = buildMergedCertData(child, cert);
      const base64 = buildCombinedPdfBase64(merged);
      const suggestedFilename = `combined-${buildPdfFilename(child, cert)}`;
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (notifyElectronSavePdfResult(result)) {
        onPdfSavedOpenInBrowser(result.filePath, 'Combined PDF');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save combined PDF.');
    }
  }, [child, cert]);

  if (loading) return <p className="text-slate-500 p-4">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (cert === null) return null;

  const merged = buildMergedCertData(child, cert);
  const getVal = (key) => getMergedValue(merged, key);
  const getAbbrevVal = (key) => abbreviateAddressText(getVal(key));

  // Get normalized attendant type for radio button logic
  const attendantType = normalizeAttendantType(getVal('attendantType') ?? getVal('attendant_type'));

  return (
    <>
      {pdfPreviewOpen && pdfPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print-hide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-position-pdf-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closePreview}
            aria-label="Close PDF preview"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id="field-position-pdf-preview-title" className="text-sm font-semibold text-slate-800">
                PDF preview
              </h2>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <iframe
              src={pdfPreviewUrl}
              title="Field position PDF preview"
              className="min-h-[70vh] w-full flex-1 border-0 bg-slate-100"
            />
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between print-hide">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to applicant
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Preview PDF
          </button>
          <button
            type="button"
            onClick={handleSavePdf}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Save as PDF
          </button>
        </div>
      </div>

      <div className="field-position-print-wrapper mx-auto bg-white min-h-screen overflow-auto" style={{ maxWidth: '100%' }}>
        <div
          className="field-position-print-area bg-white shadow-sm print:shadow-none"
          style={{
            position: 'relative',
            width: PDF_LAYOUT.document.width,
            height: PDF_LAYOUT.document.height,
            boxSizing: 'border-box',
            fontFamily: FONT_FAMILY,
            fontSize: '14px',
            color: COLORS.black,
          }}
        >
          {/* Province/City Registry */}
          <PositionedValue fieldKey="province" value={getVal('province')} />
          <PositionedValue fieldKey="city_municipality" value={getVal('cityMunicipality')} />
          <PositionedValue fieldKey="registry_no" value={getVal('registryNo')} />

          {/* Child Name */}
          <PositionedValue fieldKey="child_name_first" value={getVal('childFirst')} />
          <PositionedValue fieldKey="child_name_middle" value={getVal('childMiddle')} />
          <PositionedValue fieldKey="child_name_last" value={getVal('childLast')} />

          {/* Child Birth Info */}
          <PositionedValue fieldKey="sex" value={getVal('sex')} />
          <PositionedValue fieldKey="date_of_birth_day" value={getVal('birthDay')} />
          <PositionedValue fieldKey="date_of_birth_month" value={getVal('birthMonth')} />
          <PositionedValue fieldKey="date_of_birth_year" value={getVal('birthYear')} />
          <PositionedValue fieldKey="place_of_birth_hospital" value={getAbbrevVal('placeOfBirthName')} />
          <PositionedValue fieldKey="place_of_birth_city" value={getVal('placeOfBirthCity')} />
          <PositionedValue fieldKey="place_of_birth_province" value={getVal('placeOfBirthProvince')} />
          <PositionedValue fieldKey="type_of_birth" value={getVal('typeOfBirth')} />
          <PositionedValue fieldKey="multiple_birth_order" value={getVal('multipleBirthOrder')} />
          <PositionedValue fieldKey="birth_order" value={getVal('birthOrder')} />
          <PositionedValue fieldKey="weight_at_birth" value={getVal('weightGrams')} />

          {/* Mother Info */}
          <PositionedValue fieldKey="mother_maiden_first" value={getVal('motherFirst')} />
          <PositionedValue fieldKey="mother_maiden_middle" value={getVal('motherMiddle')} />
          <PositionedValue fieldKey="mother_maiden_last" value={getVal('motherLast')} />
          <PositionedValue fieldKey="mother_citizenship" value={getVal('motherCitizenship')} />
          <PositionedValue fieldKey="mother_religion" value={getVal('motherReligion')} />
          <PositionedValue fieldKey="mother_children_born_alive" value={getVal('motherChildrenBornAlive')} />
          <PositionedValue fieldKey="mother_children_living" value={getVal('motherChildrenLiving')} />
          <PositionedValue fieldKey="mother_children_dead" value={getVal('motherChildrenDead')} />
          <PositionedValue fieldKey="mother_occupation" value={getVal('motherOccupation')} />
          <PositionedValue fieldKey="mother_age" value={getVal('motherAge')} />
          <PositionedValue fieldKey="mother_residence_house" value={getAbbrevVal('motherResidenceLine1')} />
          <PositionedValue fieldKey="mother_residence_city" value={getVal('motherResidenceCity')} />
          <PositionedValue fieldKey="mother_residence_province" value={getVal('motherResidenceProvince')} />
          <PositionedValue fieldKey="mother_country" value={getVal('motherCountry')} />

          {/* Father Info */}
          <PositionedValue fieldKey="father_name_first" value={getVal('fatherFirst')} />
          <PositionedValue fieldKey="father_name_middle" value={getVal('fatherMiddle')} />
          <PositionedValue fieldKey="father_name_last" value={getVal('fatherLast')} />
          <PositionedValue fieldKey="father_citizenship" value={getVal('fatherCitizenship')} />
          <PositionedValue fieldKey="father_religion" value={getVal('fatherReligion')} />
          <PositionedValue fieldKey="father_occupation" value={getVal('fatherOccupation')} />
          <PositionedValue fieldKey="father_age" value={getVal('fatherAge')} />
          <PositionedValue fieldKey="father_residence_house" value={getAbbrevVal('fatherResidenceLine1')} />
          <PositionedValue fieldKey="father_residence_city" value={getVal('fatherResidenceCity')} />
          <PositionedValue fieldKey="father_residence_province" value={getVal('fatherResidenceProvince')} />
          <PositionedValue fieldKey="father_country" value={getVal('fatherCountry')} />

          {/* Marriage */}
          <PositionedValue fieldKey="marriage_date_month" value={getVal('marriageMonth')} />
          <PositionedValue fieldKey="marriage_date_day" value={getVal('marriageDay')} />
          <PositionedValue fieldKey="marriage_date_year" value={getVal('marriageYear')} />
          <PositionedValue fieldKey="marriage_place_city" value={getVal('marriagePlaceCity')} />
          <PositionedValue fieldKey="marriage_place_province" value={getVal('marriagePlaceProvince')} />
          <PositionedValue fieldKey="marriage_place_country" value={getVal('marriagePlaceCountry')} />

          {/* Attendant Type Radio Buttons - matching CertificateOfLiveBirth style */}
          <RadioMark x={282} y={2277} show={attendantType === 'physician'} />
          <RadioMark x={600} y={2277} show={attendantType === 'nurse'} />
          <RadioMark x={875} y={2277} show={attendantType === 'midwife'} />
          <RadioMark x={1179} y={2277} show={attendantType === 'hilot'} />
          <RadioMark x={1794} y={2277} show={attendantType === 'other'} />

          {/* Attendant Type Specify (only show for "other") */}
          <PositionedValue fieldKey="attendant_type_specify" value={attendantType === 'other' ? (getVal('attendantTypeSpecify') ?? getVal('attendantOthersSpecify') ?? '') : ''} />

          {/* Attendant */}
          <PositionedValue fieldKey="attendant_name" value={getVal('attendantName')} />
          <PositionedValue fieldKey="attendant_title" value={getVal('attendantTitle')} />
          <PositionedValue
            fieldKey="attendant_signature"
            value={getSignatureOrName(getVal('attendantSignature'), getVal('attendantName'))}
          />
          <PositionedValue
            fieldKey="attendant_address"
            value={getAbbrevVal('attendantAddress')}
            fontLenSource={getVal('attendantAddress')}
          />
          <PositionedValue fieldKey="attendant_date" value={getVal('attendantDate')} />
          <PositionedValue
            fieldKey="attendant_time"
            value={joinTimeParts(getVal('attendantTime'), getVal('attendantAmpm'))}
          />

          {/* Informant */}
          <PositionedValue
            fieldKey="informant_signature"
            value={getSignatureOrName(getVal('informantSignature'), getVal('informantName'))}
          />
          <PositionedValue fieldKey="informant_relation" value={getVal('informantRelationship')} />
          <PositionedValue
            fieldKey="informant_address"
            value={getAbbrevVal('informantAddress')}
            fontLenSource={getVal('informantAddress')}
          />
          <PositionedValue fieldKey="informant_date" value={getVal('informantDate')} />

          {/* Administrative */}
          <PositionedValue fieldKey="prepared_by" value={getSignatureOrName(getVal('preparedBySignature'), getVal('preparedByName'))} />
          <PositionedValue fieldKey="prepared_by_title" value={getVal('preparedByTitle')} />
          <PositionedValue fieldKey="prepared_by_date" value={getVal('preparedByDate')} />
          <PositionedValue fieldKey="received_by" value={getSignatureOrName(getVal('receivedBySignature'), getVal('receivedByName'))} />
          <PositionedValue fieldKey="received_by_title" value={getVal('receivedByTitle')} />
          <PositionedValue fieldKey="received_by_date" value={getVal('receivedByDate')} />
          <PositionedValue fieldKey="registered_by" value={getSignatureOrName(getVal('registeredBySignature'), getVal('registeredByName'))} />
          <PositionedValue fieldKey="registered_by_title" value={getVal('registeredByTitle')} />
          <PositionedValue fieldKey="registered_by_date" value={getVal('registeredByDate')} />

          {/* Remarks */}
          <PositionedValue fieldKey="remarks" value={getVal('remarks')} />

          {/* Registrar boxes */}
          {REGISTRAR_BOX_COORDINATES.flatMap((group) =>
            group.xs.map((_, idx) => (
              <PositionedValue
                key={`registrar-${group.label}-${idx}`}
                fieldKey={`registrar_${group.label}_${idx}`}
                value={String(getVal(group.valueKey) ?? '').charAt(idx)}
              />
            )),
          )}
        </div>
      </div>
    </>
  );
}
