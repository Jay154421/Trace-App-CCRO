import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../services/api';

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
};

const FONT_FAMILY = 'Arial';

const LAYOUT = {
  document: {
    width: 2550,
    height: 4200,
    unit: 'px',
    paper: '8.5x14in',
    dpi: 300,
  },
  fields: { 
    province: { x: 600, y: 447},
    city_municipality: { x: 600, y: 519},
    registry_no: { x: 1634, y: 477},
    child_name_first: { x: 531, y: 648},
    child_name_middle: {x: 1179, y: 648},
    child_name_last: { x: 1830, y: 648},
    sex: { x: 600, y: 753 },
    date_of_birth_day: { x: 1380, y: 753},
    date_of_birth_month: { x: 1722, y: 753},
    date_of_birth_year: { x: 2124, y: 753},
    place_of_birth_hospital: { x: 576, y: 885 },
    place_of_birth_city: { x: 1470, y: 885},
    place_of_birth_province: { x: 1872, y: 885},
    type_of_birth: { x: 456, y: 1038},
    multiple_birth_order: { x: 1056, y: 1038},
    birth_order: { x: 1725, y: 1038},
    weight_at_birth: { x: 2124, y: 1038},         
    mother_maiden_first: { x: 531, y: 1167},
    mother_maiden_middle: { x: 1179, y: 1167},
    mother_maiden_last: { x: 1830, y: 1167},
    mother_citizenship: { x: 543, y: 1275},
    mother_religion: { x: 1800, y: 1275},
    mother_children_born_alive: { x: 459, y: 1440},
    mother_children_living: { x: 786, y: 1440},
    mother_children_dead: { x: 1056, y: 1440},
    mother_occupation: { x: 1392, y: 1440},
    mother_age: { x: 2175, y: 1440 },
    mother_residence_house: { x: 336, y: 1557},
    mother_residence_city: { x: 1122, y: 1557},
    mother_residence_province: { x: 1605, y: 1557},
    mother_country: { x: 2070, y: 1557},
    father_name_first: { x: 531, y: 1677, width: 640},
    father_name_middle: { x: 1179, y: 1677, width: 640},
    father_name_last: { x: 1830, y: 1677, width: 640},
    father_citizenship: { x: 336, y: 1818},
    father_religion: { x: 900, y: 1818},
    father_occupation: { x: 1509, y: 1818},
    father_age: { x: 2175, y: 1818 },
    father_residence_house: { x: 336, y: 1959},
    father_residence_city: { x: 1122, y: 1959},  ///x-1203
    father_residence_province: { x: 1605, y: 1959},
    father_country: { x: 2070, y: 1959},
    marriage_date: { x: 471, y: 2148},
    marriage_place: { x: 1287, y: 2148},
    // attendant_type: { x: 507, y: 2646,},
    // attendant_signature: { x: 86, y: 3391, width: 860, height: 132 },
    attendant_title: { x: 507, y: 2643 },
    attendant_name: { x: 483, y: 2562},
    attendant_address: { x: 1500, y: 2505, width: 944},
    attendant_date: { x: 1512, y: 2643},
    attendant_time: { x: 1533, y: 2409},
    informant_signature: { x: 507, y: 2856},
    informant_relation: { x: 612, y: 3000},
    informant_address: { x: 399, y: 3057},
    informant_date: { x: 519, y: 3129},
    received_by: { x: 519, y: 3306 },
    received_by_title: { x: 519, y: 3375},
    received_by_date: { x: 519, y: 3447 },
    prepared_by: { x: 1665, y: 2928 },
    prepared_by_title: { x: 1665, y: 3000},
    prepared_by_date: { x: 1665, y: 3069 },
    registered_by: { x: 1665, y: 3306 },
    registered_by_title: { x: 1665, y: 3375 },
    registered_by_date: { x: 1665, y: 3447 },
  },
};

/** Space between form columns (layout px) so wrapped PDF/overlay text does not bleed into the next box. */
const PDF_COLUMN_GUTTER_PX = 20;

/**
 * Multi-column form rows, keys ordered left → right by `x`.
 * Used to infer each column width when `field.width` is not set.
 */
const PDF_MULTI_COLUMN_ROWS = [
  ['child_name_first', 'child_name_middle', 'child_name_last'],
  ['sex', 'date_of_birth_day', 'date_of_birth_month', 'date_of_birth_year'],
  ['place_of_birth_hospital', 'place_of_birth_city', 'place_of_birth_province'],
  ['type_of_birth', 'multiple_birth_order', 'birth_order', 'weight_at_birth'],
  ['mother_maiden_first', 'mother_maiden_middle', 'mother_maiden_last'],
  ['mother_citizenship', 'mother_religion'],
  [
    'mother_children_born_alive',
    'mother_children_living',
    'mother_children_dead',
    'mother_occupation',
    'mother_age',
  ],
  [
    'mother_residence_house',
    'mother_residence_city',
    'mother_residence_province',
    'mother_country',
  ],
  ['father_citizenship', 'father_religion', 'father_occupation', 'father_age'],
  [
    'father_residence_house',
    'father_residence_city',
    'father_residence_province',
    'father_country',
  ],
  ['marriage_date', 'marriage_place'],
];

/** Single fields: max width from x to a logical right edge (layout px). */
const PDF_FIELD_MAX_WIDTH_TO_X = {
  informant_address: 1665,
  informant_relation: 1665,
  attendant_name: 1500,
  attendant_title: 1512,
  attendant_date: LAYOUT.document.width,
  attendant_time: LAYOUT.document.width,
};

/**
 * @param {string} fieldKey
 * @returns {number | null} width in layout px, or null if unconstrained
 */
function getEffectiveColumnWidthPx(fieldKey) {
  const field = LAYOUT.fields[fieldKey];
  if (!field) return null;
  if (field.width != null && field.width > 0) return field.width;

  const docW = LAYOUT.document.width;
  for (const row of PDF_MULTI_COLUMN_ROWS) {
    const idx = row.indexOf(fieldKey);
    if (idx === -1) continue;
    const x0 = LAYOUT.fields[row[idx]].x;
    if (idx + 1 < row.length) {
      const x1 = LAYOUT.fields[row[idx + 1]].x;
      return Math.max(48, x1 - x0 - PDF_COLUMN_GUTTER_PX);
    }
    return Math.max(48, docW - x0 - PDF_COLUMN_GUTTER_PX);
  }

  const rightEdge = PDF_FIELD_MAX_WIDTH_TO_X[fieldKey];
  if (rightEdge != null) {
    return Math.max(48, rightEdge - field.x - PDF_COLUMN_GUTTER_PX);
  }
  return null;
}

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
  'marriage_date', 'marriage_place',
];

// Map each layout field key to how we get the value (cert key or function of f)
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
  { key: 'marriage_date', getValue: (f) => [f('marriageMonth'), f('marriageDay'), f('marriageYear')].filter(Boolean).join(' / ') },
  { key: 'marriage_place', valueKey: 'marriagePlace' },
  // { key: 'attendant_type', valueKey: 'attendantType' },
  { key: 'attendant_title', valueKey: 'attendantTitle' },
  { key: 'attendant_name', valueKey: 'attendantName' },
  { key: 'attendant_signature', getValue: (f) => f('attendantSignature') || f('attendantName') },
  { key: 'attendant_address', valueKey: 'attendantAddress' },
  { key: 'attendant_date', valueKey: 'attendantDate' },
  { key: 'attendant_time', getValue: (f) => [f('attendantTime'), f('attendantAmpm')].filter(Boolean).join(' ') },  
  { key: 'informant_signature', getValue: (f) => f('informantSignature') || f('informantName') },
  { key: 'informant_relation', valueKey: 'informantRelationship' },
  { key: 'informant_address', valueKey: 'informantAddress' },
  { key: 'informant_date', valueKey: 'informantDate' },
  { key: 'prepared_by', getValue: (f) => f('preparedBySignature') || f('preparedByName') },
  { key: 'prepared_by_title', valueKey: 'preparedByTitle' },
  { key: 'prepared_by_date', valueKey: 'preparedByDate' },
  { key: 'received_by', getValue: (f) => f('receivedBySignature') || f('receivedByName') },
  { key: 'received_by_title', valueKey: 'receivedByTitle' },
  { key: 'received_by_date', valueKey: 'receivedByDate' },
  { key: 'registered_by', getValue: (f) => f('registeredBySignature') || f('registeredByName') },
  { key: 'registered_by_title', valueKey: 'registeredByTitle' },
  { key: 'registered_by_date', valueKey: 'registeredByDate' },
];

/** Layout field keys whose values are address lines (abbreviate before COB uppercase). */
const ADDRESS_ABBREV_FIELD_KEYS = new Set([
  'place_of_birth_hospital',
  'marriage_place',
  'mother_residence_house',
  'father_residence_house',
  'attendant_address',
  'informant_address',
]);

/** Whole-word abbreviations for address lines (Street → St., Barangay → Brgy.). */
function abbreviateAddressText(value) {
  if (value === '' || value === undefined || value === null) return '';
  const s = String(value);
  if (!s.trim()) return s;
  return s
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

// Font size for all positioned field values (matches ~10pt PDF at this layout scale)
const POSITIONED_FONT_SIZE = 20;
const INFORMANT_ADDRESS_COMPACT_LEN = 44;
const INFORMANT_ADDRESS_COMPACT_PDF_PT = 8;
const INFORMANT_ADDRESS_COMPACT_OVERLAY_PX =
  (INFORMANT_ADDRESS_COMPACT_PDF_PT / 10) * POSITIONED_FONT_SIZE;

/** All COB (certificate of live birth) field values display in uppercase. */
function toCobDisplay(value) {
  if (value === '' || value === undefined || value === null) return '';
  return String(value).toUpperCase();
}

function PositionedValue({ fieldKey, value, fontLenSource }) {
  const field = LAYOUT.fields[fieldKey];
  if (!field) return null;
  const display = toCobDisplay(value);
  const lenForFont =
    fieldKey === 'informant_address' && fontLenSource !== undefined && fontLenSource !== null
      ? String(fontLenSource).trim().length
      : String(value ?? '').trim().length;
  const fontPx =
    fieldKey === 'informant_address' && lenForFont >= INFORMANT_ADDRESS_COMPACT_LEN
      ? INFORMANT_ADDRESS_COMPACT_OVERLAY_PX
      : POSITIONED_FONT_SIZE;
  const isCentered = CENTERED_FIELD_KEYS.includes(fieldKey);
  const colW = getEffectiveColumnWidthPx(fieldKey);
  const boxWidth = field.width ?? colW ?? undefined;
  const useWrap = boxWidth != null;
  return (
    <span
      className="absolute overflow-hidden"
      style={{
        left: field.x,
        top: field.y,
        width: boxWidth,
        height: field.height,
        maxHeight: field.height == null && useWrap ? 120 : undefined,
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

function parseDateOfBirth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { day: '', month: '', year: '' };
  const trimmed = dateStr.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (iso) return { day: iso[3], month: iso[2], year: iso[1] };
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return { day: '', month: '', year: '' };
  return {
    day: String(d.getDate()),
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
  };
}

function countryDisplayFromCodeOrText(codeOrText) {
  if (!codeOrText || typeof codeOrText !== 'string') return '';
  const t = codeOrText.trim();
  if (t.length === 2 && /^[A-Za-z]{2}$/.test(t)) {
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      const n = dn.of(t.toUpperCase());
      if (n && n !== t.toUpperCase()) return n;
    } catch (_) {}
  }
  return t;
}

function getMergedCert(child, cert) {
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
  return {
    ...cert,
    childFirst: cert.childFirst ?? cert.child_first ?? child?.first_name ?? '',
    childMiddle: cert.childMiddle ?? cert.child_middle ?? child?.middle_name ?? '',
    childLast: cert.childLast ?? cert.child_last ?? child?.last_name ?? '',
    birthDay: cert.birthDay ?? cert.birth_day ?? birth.day ?? '',
    birthMonth: cert.birthMonth ?? cert.birth_month ?? birth.month ?? '',
    birthYear: cert.birthYear ?? cert.birth_year ?? birth.year ?? '',
    motherCountry: mc,
    fatherCountry: fc,
  };
}

function buildFieldPositionPdfSuggestedFileName(child, cert) {
  const merged = getMergedCert(child, cert);
  const parts = [merged.childFirst, merged.childMiddle, merged.childLast].filter(
    (p) => p && String(p).trim()
  );
  const rawName = parts.join(' ');
  const name =
    rawName
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 150) || 'Applicant';
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${name}-${dateStr}.pdf`;
}

const PDF_MIN_SHRINK_PT = 7;
const PDF_SHRINK_STEP = 0.5;

/**
 * Keep preferredPt if one line fits at that size. Otherwise shrink only when a smaller
 * font reduces wrapped line count; among those, use the largest font that achieves the
 * minimum line count (slightly smaller only when it helps).
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
    } catch (_) {}
    return 1;
  };

  let minLines = Infinity;
  let bestPt = preferredPt;
  for (let pt = preferredPt; pt >= PDF_MIN_SHRINK_PT; pt -= PDF_SHRINK_STEP) {
    const n = lineCountAt(pt);
    if (n < minLines) {
      minLines = n;
      bestPt = pt;
    } else if (n === minLines) {
      bestPt = Math.max(bestPt, pt);
    }
  }
  doc.setFontSize(bestPt);
  return bestPt;
}

// Build PDF from merged cert data so content is guaranteed in the file (no print capture)
function buildFieldPositionPdfBase64(merged) {
  const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const f = (camelKey) => merged[camelKey] ?? merged[camelToSnake(camelKey)];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'legal' });
  doc.setFont('helvetica');
  const DEFAULT_PDF_FONT_PT = 10;
  doc.setFontSize(DEFAULT_PDF_FONT_PT);
  doc.setTextColor(0, 0, 0);

  const W = LAYOUT.document.width;
  const H = LAYOUT.document.height;
  const pageW = 8.5;
  const pageH = 14;

  for (const item of FIELD_VALUE_MAP) {
    const field = LAYOUT.fields[item.key];
    if (!field) continue;

    const raw = item.getValue ? item.getValue(f) : f(item.valueKey);
    const rawTrimLen = String(raw ?? '').trim().length;
    const fontPt =
      item.key === 'informant_address' && rawTrimLen >= INFORMANT_ADDRESS_COMPACT_LEN
        ? INFORMANT_ADDRESS_COMPACT_PDF_PT
        : item.key === 'weight_at_birth'
          ? 8
          : DEFAULT_PDF_FONT_PT;
    doc.setFontSize(fontPt);
    const defaultLineHeightIn = (fontPt * 1.2) / 72;

    const value = ADDRESS_ABBREV_FIELD_KEYS.has(item.key) ? abbreviateAddressText(raw) : raw;
    const str = toCobDisplay(value);
    const xIn = (field.x / W) * pageW;
    let yIn = ((field.y + 25) / H) * pageH;
    const widthPx = getEffectiveColumnWidthPx(item.key);
    const maxWidthIn =
      widthPx != null && widthPx > 0 ? (widthPx / W) * pageW : null;
    const inputLines = str.split(/\r?\n/);

    for (let i = 0; i < inputLines.length; i++) {
      const line = inputLines[i];
      if (maxWidthIn != null && maxWidthIn > 0) {
        const chosenPt = pickPdfFontPtForColumn(doc, line, maxWidthIn, fontPt);
        doc.setFontSize(chosenPt);
        const lineHeightIn = (chosenPt * 1.2) / 72;
        const opts = { maxWidth: maxWidthIn };
        doc.text(line, xIn, yIn, opts);
        let lineHeightUsed = lineHeightIn;
        if (typeof doc.getTextDimensions === 'function') {
          try {
            const dims = doc.getTextDimensions(line, opts);
            if (dims && typeof dims.h === 'number' && dims.h > 0) {
              lineHeightUsed = dims.h;
            }
          } catch (_) {}
        }
        yIn += lineHeightUsed;
      } else {
        doc.setFontSize(fontPt);
        doc.text(line, xIn, yIn);
        yIn += defaultLineHeightIn;
      }
    }
  }

  const dataUri = doc.output('datauristring');
  return dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] : '';
}

export function FieldPosition() {
  const { id } = useParams();
  const [child, setChild] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const pdfPreviewObjectUrlRef = useRef(null);

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

  useEffect(() => {
    const styleId = 'field-position-print';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: 8.5in 14in; margin: 0; }
        html, body {
          margin: 0; padding: 0;
          width: 8.5in; height: 14in;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body * { visibility: hidden; }
        .field-position-print-wrapper {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 8.5in !important; height: 14in !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .field-position-print-wrapper,
        .field-position-print-area,
        .field-position-print-area * { visibility: visible !important; }
        .field-position-print-area {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          margin: 0 !important; padding: 0 !important;
          transform-origin: top left;
          transform: scale(0.32);
          width: 2550px; height: 4200px;
        }
        aside[aria-label="Main navigation"],
        .print-hide { display: none !important; visibility: hidden !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove()
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewObjectUrlRef.current);
        pdfPreviewObjectUrlRef.current = null;
      }
    };
  }, []);

  const releasePdfPreviewUrl = () => {
    if (pdfPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewObjectUrlRef.current);
      pdfPreviewObjectUrlRef.current = null;
    }
    setPdfPreviewUrl(null);
  };

  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    releasePdfPreviewUrl();
  };

  const handlePreviewPdf = () => {
    try {
      const merged = getMergedCert(child, cert);
      const base64 = buildFieldPositionPdfBase64(merged);
      if (!base64) {
        toast.error('Could not generate PDF.');
        return;
      }
      releasePdfPreviewUrl();
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      pdfPreviewObjectUrlRef.current = url;
      setPdfPreviewUrl(url);
      setPdfPreviewOpen(true);
    } catch (e) {
      toast.error(e?.message || 'Preview failed.');
    }
  };

  const handleSavePdf = async () => {
    if (!window.electron?.saveFieldPositionPdf) return;
    try {
      const merged = getMergedCert(child, cert);
      const base64 = buildFieldPositionPdfBase64(merged);
      const suggested = buildFieldPositionPdfSuggestedFileName(child, cert);
      const result = await window.electron.saveFieldPositionPdf(base64, suggested);
      if (result?.ok) {
        toast.success('PDF saved.');
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to save PDF.');
    }
  };

  if (loading) return <p className="text-slate-500 p-4">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (cert === null) return null;

  const merged = getMergedCert(child, cert);
  const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const f = (camelKey) => merged[camelKey] ?? merged[camelToSnake(camelKey)];
  const addr = (camelKey) => abbreviateAddressText(f(camelKey));

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
            onClick={closePdfPreview}
            aria-label="Close PDF preview"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id="field-position-pdf-preview-title" className="text-sm font-semibold text-slate-800">
                PDF preview
              </h2>
              <button
                type="button"
                onClick={closePdfPreview}
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
        <Link to={`/children/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to applicant</Link>
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
            width: LAYOUT.document.width,
            height: LAYOUT.document.height,
            boxSizing: 'border-box',
            fontFamily: FONT_FAMILY,
            fontSize: '14px',
            color: COLORS.black,
          }}
        >
          <PositionedValue fieldKey="province" value={f('province')} />
          <PositionedValue fieldKey="city_municipality" value={f('cityMunicipality')} />
          <PositionedValue fieldKey="registry_no" value={f('registryNo')} />
          <PositionedValue fieldKey="child_name_first" value={f('childFirst')} />
          <PositionedValue fieldKey="child_name_middle" value={f('childMiddle')} />
          <PositionedValue fieldKey="child_name_last" value={f('childLast')} />
          <PositionedValue fieldKey="sex" value={f('sex')} />
          <PositionedValue fieldKey="date_of_birth_day" value={f('birthDay')} />
          <PositionedValue fieldKey="date_of_birth_month" value={f('birthMonth')} />
          <PositionedValue fieldKey="date_of_birth_year" value={f('birthYear')} />
          <PositionedValue fieldKey="place_of_birth_hospital" value={addr('placeOfBirthName')} />
          <PositionedValue fieldKey="place_of_birth_city" value={f('placeOfBirthCity')} />
          <PositionedValue fieldKey="place_of_birth_province" value={f('placeOfBirthProvince')} />
          <PositionedValue fieldKey="type_of_birth" value={f('typeOfBirth')} />
          <PositionedValue fieldKey="multiple_birth_order" value={f('multipleBirthOrder')} />
          <PositionedValue fieldKey="birth_order" value={f('birthOrder')} />
          <PositionedValue fieldKey="weight_at_birth" value={f('weightGrams')} />
          <PositionedValue fieldKey="mother_maiden_first" value={f('motherFirst')} />
          <PositionedValue fieldKey="mother_maiden_middle" value={f('motherMiddle')} />
          <PositionedValue fieldKey="mother_maiden_last" value={f('motherLast')} />
          <PositionedValue fieldKey="mother_citizenship" value={f('motherCitizenship')} />
          <PositionedValue fieldKey="mother_religion" value={f('motherReligion')} />
          <PositionedValue fieldKey="mother_children_born_alive" value={f('motherChildrenBornAlive')} />
          <PositionedValue fieldKey="mother_children_living" value={f('motherChildrenLiving')} />
          <PositionedValue fieldKey="mother_children_dead" value={f('motherChildrenDead')} />
          <PositionedValue fieldKey="mother_occupation" value={f('motherOccupation')} />
          <PositionedValue fieldKey="mother_age" value={f('motherAge')} />
          <PositionedValue fieldKey="mother_residence_house" value={addr('motherResidenceLine1')} />
          <PositionedValue fieldKey="mother_residence_city" value={f('motherResidenceCity')} />
          <PositionedValue fieldKey="mother_residence_province" value={f('motherResidenceProvince')} />
          <PositionedValue fieldKey="mother_country" value={f('motherCountry')} />
          <PositionedValue fieldKey="father_name_first" value={f('fatherFirst')} />
          <PositionedValue fieldKey="father_name_middle" value={f('fatherMiddle')} />
          <PositionedValue fieldKey="father_name_last" value={f('fatherLast')} />
          <PositionedValue fieldKey="father_citizenship" value={f('fatherCitizenship')} />
          <PositionedValue fieldKey="father_religion" value={f('fatherReligion')} />
          <PositionedValue fieldKey="father_occupation" value={f('fatherOccupation')} />
          <PositionedValue fieldKey="father_age" value={f('fatherAge')} />
          <PositionedValue fieldKey="father_residence_house" value={addr('fatherResidenceLine1')} />
          <PositionedValue fieldKey="father_residence_city" value={f('fatherResidenceCity')} />
          <PositionedValue fieldKey="father_residence_province" value={f('fatherResidenceProvince')} />
          <PositionedValue fieldKey="father_country" value={f('fatherCountry')} />
          <PositionedValue
            fieldKey="marriage_date"
            value={[f('marriageMonth'), f('marriageDay'), f('marriageYear')].filter(Boolean).join(' / ')}
          />
          <PositionedValue fieldKey="marriage_place" value={addr('marriagePlace')} />
          <PositionedValue fieldKey="attendant_type" value={f('attendantType')} />
          <PositionedValue fieldKey="attendant_title" value={f('attendantTitle')} />
          <PositionedValue fieldKey="attendant_name" value={f('attendantName')} />
          <PositionedValue fieldKey="attendant_signature" value={f('attendantSignature') || f('attendantName')} />
          <PositionedValue fieldKey="attendant_address" value={addr('attendantAddress')} />
          <PositionedValue fieldKey="attendant_date" value={f('attendantDate')} />
          <PositionedValue fieldKey="attendant_time" value={[f('attendantTime'), f('attendantAmpm')].filter(Boolean).join(' ')} />
          <PositionedValue fieldKey="informant_signature" value={f('informantSignature') || f('informantName')} />
          <PositionedValue fieldKey="informant_relation" value={f('informantRelationship')} />
          <PositionedValue
            fieldKey="informant_address"
            value={addr('informantAddress')}
            fontLenSource={f('informantAddress')}
          />
          <PositionedValue fieldKey="informant_date" value={f('informantDate')} />
          <PositionedValue fieldKey="received_by" value={f('receivedBySignature') || f('receivedByName')} />
          <PositionedValue fieldKey="received_by_title" value={f('receivedByTitle')} />
          <PositionedValue fieldKey="received_by_date" value={f('receivedByDate')} />
          <PositionedValue fieldKey="prepared_by" value={f('preparedBySignature') || f('preparedByName')} />
          <PositionedValue fieldKey="prepared_by_title" value={f('preparedByTitle')} />
          <PositionedValue fieldKey="prepared_by_date" value={f('preparedByDate')} />
          <PositionedValue fieldKey="registered_by" value={f('registeredBySignature') || f('registeredByName')} />
          <PositionedValue fieldKey="registered_by_title" value={f('registeredByTitle')} />
          <PositionedValue fieldKey="registered_by_date" value={f('registeredByDate')} />
        </div>
      </div>
    </>
  );
}
