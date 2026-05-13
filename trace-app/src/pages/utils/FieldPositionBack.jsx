import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../../services/api';
import { usePdfPreviewUrl } from '../../hooks/usePdfPreviewUrl';

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
    white: '#FFFFFF',
    black: '#000000',
};

const FONT_FAMILY = 'Arial';

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
// Field position coordinates (layout pixels) for BACK SIDE (Affidavits)
const FIELD_POSITIONS = {
    // --- AFFIDAVIT OF ACKNOWLEDGMENT/ADMISSION OF PATERNITY ---
    pa_mother_name: { x: 415, y: 298, width: 840 },
    pa_father_name: { x: 1368, y: 298, width: 885 },
    pa_child_name: { x: 1122, y: 354, width: 990 },
    pa_dob: { x: 306, y: 402, width: 567 },
    pa_pob: { x: 965, y: 402, width: 876 },
    pa_father_signature_name: { x: 234, y: 660, width: 890 },
    pa_mother_signature_name: { x: 1354, y: 660, width: 890 },
    pa_sworn_day: { x: 1200, y: 837 },
    pa_sworn_month: { x: 1581, y: 837},
    pa_sworn_year: { x: 2076, y: 837},
    pa_sworn_by_1: { x: 165, y: 909, width: 696 },
    pa_sworn_by_2: { x: 990, y: 909, width: 687 },
    pa_ctc_no: { x: 588, y: 975, width: 864 },
    pa_issued_on: { x: 1629, y: 975, width: 639 },
    pa_issued_at: { x: 234, y: 1026, width: 861 },
    pa_admin_officer: { x: 1275, y: 1275, width: 897 },
    pa_name_in_print: { x: 246, y: 1356, width: 897 },
    pa_position: { x: 1275, y: 1260, width: 897 },
    pa_address: { x: 1275, y: 1356, width: 897 },

    // --- AFFIDAVIT FOR DELAYED REGISTRATION OF BIRTH ---
    dra_affiant_name: { x: 314, y: 1617, width: 921 },
    dra_marital_status: { x: 1248, y: 1617, width: 480 },
    dra_residence: { x: 744, y: 1705, width: 1521 },
    dra_self_birth_place: { x: 732, y: 1928, width: 885 },
    dra_self_birth_date: { x: 1794, y: 1928, width: 534 },
    dra_other_birth_name: { x: 732, y: 2001, width: 708 },
    dra_other_birth_place: { x: 1794, y: 2001, width: 495 },
    dra_other_birth_date: { x: 1191, y: 2088, width: 567 },
    dra_attended_by: { x: 1086, y: 2172, width: 945 },
    dra_attendant_address: { x: 435, y: 2220, width: 1620 },
    dra_citizenship: { x: 1062, y: 2313, width: 852 },
    dra_marriage_date: { x: 1261, y: 2405, width: 483 },
    dra_marriage_place: { x: 1854, y: 2405, width: 411 },
    dra_father_name: { x: 1521, y: 2610, width: 723 },
    dra_delay_reason: { x: 1488, y: 2706, width: 777 },
    dra_spouse_name: { x: 1192, y: 2848, width: 732 },
    dra_relationship: { x: 1521, y: 2938, width: 402 },
    dra_affiant_signature: { x: 1428, y: 3399, width: 825 },
    dra_affixed_day: { x: 1251, y: 3192 },
    dra_affixed_month: { x: 1521, y: 3192, width: 675 },
    dra_affixed_at: { x: 1139, y: 3266, width: 840 },
    dra_sworn_day: { x: 1179, y: 3588 },
    dra_sworn_month: { x: 1488, y: 3588, width: 483 },
    dra_sworn_year: { x: 2043, y: 3588, width: 189 },
    dra_sworn_at: { x: 164, y: 3652, width: 1026 },
    dra_ctc_no: { x: 162, y: 3716, width: 330 },
    dra_issued_on: { x: 732, y: 3716, width: 567 },
    dra_issued_at: { x: 1410, y: 3716, width: 849 },
    dra_admin_officer: { x: 1332, y: 3837, width: 852 },
    dra_position: { x: 1332, y: 3825, width: 852 },
    dra_name_in_print: { x: 282, y: 3948, width: 861 },
    dra_address: { x: 1332, y: 3948, width: 852 },

    // DRA Checkboxes
    dra_chk_self_birth: { x: 411, y: 1908 },
    dra_chk_other_birth: { x: 411, y: 2001 },
    dra_chk_married: { x: 966, y: 2401 },
    dra_chk_not_married: { x: 966, y: 2542 },
};

/** Space between form columns to prevent text bleeding into next box */
const PDF_COLUMN_GUTTER_PX = 20;

/** Multi-column form rows for inferring column width */
const PDF_MULTI_COLUMN_ROWS = [
    ['pa_mother_name', 'pa_father_name'],
    ['pa_sworn_day', 'pa_sworn_month', 'pa_sworn_year'],
    ['dra_affixed_day', 'dra_affixed_month'],
    ['dra_sworn_day', 'dra_sworn_month', 'dra_sworn_year'],
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
const OVERLAY_MIN_SHRINK_FONT_PX = 12;
const OVERLAY_SHRINK_STEP_PX = 0.5;
const OVERLAY_HORIZONTAL_PADDING_PX = 8;

/** Attendant address shrinking threshold for PDF (characters) */
const ATTENDANT_ADDRESS_SHRINK_MIN_CHARS_PDF = 35;
const ATTENDANT_ADDRESS_SHRINK_MAX_CHARS_PDF = 60;
const ATTENDANT_ADDRESS_MIN_FONT_PT = 9;

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
/**
 * Map layout field keys to how to get the value (cert key or function)
 */
const FIELD_VALUE_MAP = [
    // Paternity Affidavit
    { key: 'pa_mother_name', getValue: (getVal) => getVal('paternity_affidavit')?.motherName || '' },
    { key: 'pa_father_name', getValue: (getVal) => getVal('paternity_affidavit')?.fatherName || '' },
    { key: 'pa_child_name', getValue: (getVal) => getVal('paternity_affidavit')?.childName || '' },
    { key: 'pa_dob', getValue: (getVal) => getVal('paternity_affidavit')?.dob || '' },
    { key: 'pa_pob', getValue: (getVal) => getVal('paternity_affidavit')?.pob || '' },
    { key: 'pa_father_signature_name', getValue: (getVal) => getVal('paternity_affidavit')?.fatherSignatureName || '' },
    { key: 'pa_mother_signature_name', getValue: (getVal) => getVal('paternity_affidavit')?.motherSignatureName || '' },
    { key: 'pa_sworn_day', getValue: (getVal) => getVal('paternity_affidavit')?.swornDay || '' },
    { key: 'pa_sworn_month', getValue: (getVal) => getVal('paternity_affidavit')?.swornMonth || '' },
    { key: 'pa_sworn_year', getValue: (getVal) => getVal('paternity_affidavit')?.swornYear || '' },
    { key: 'pa_sworn_by_1', getValue: (getVal) => getVal('paternity_affidavit')?.swornBy1 || '' },
    { key: 'pa_sworn_by_2', getValue: (getVal) => getVal('paternity_affidavit')?.swornBy2 || '' },
    { key: 'pa_ctc_no', getValue: (getVal) => getVal('paternity_affidavit')?.ctcNo || '' },
    { key: 'pa_issued_on', getValue: (getVal) => getVal('paternity_affidavit')?.issuedOn || '' },
    { key: 'pa_issued_at', getValue: (getVal) => getVal('paternity_affidavit')?.issuedAt || '' },
    { key: 'pa_admin_officer', getValue: (getVal) => getVal('paternity_affidavit')?.administeringOfficer || '' },
    { key: 'pa_name_in_print', getValue: (getVal) => getVal('paternity_affidavit')?.nameInPrint || '' },
    { key: 'pa_position', getValue: (getVal) => getVal('paternity_affidavit')?.position || '' },
    { key: 'pa_address', getValue: (getVal) => getVal('paternity_affidavit')?.address || '' },

    // Delayed Registration Affidavit
    { key: 'dra_affiant_name', getValue: (getVal) => getVal('delayed_registration_affidavit')?.affiantName || '' },
    { key: 'dra_marital_status', getValue: (getVal) => getVal('delayed_registration_affidavit')?.maritalStatus || '' },
    { key: 'dra_residence', getValue: (getVal) => getVal('delayed_registration_affidavit')?.residence || '' },
    { key: 'dra_self_birth_place', getValue: (getVal) => getVal('delayed_registration_affidavit')?.selfBirthPlace || '' },
    { key: 'dra_self_birth_date', getValue: (getVal) => getVal('delayed_registration_affidavit')?.selfBirthDate || '' },
    { key: 'dra_other_birth_name', getValue: (getVal) => getVal('delayed_registration_affidavit')?.otherBirthName || '' },
    { key: 'dra_other_birth_place', getValue: (getVal) => getVal('delayed_registration_affidavit')?.otherBirthPlace || '' },
    { key: 'dra_other_birth_date', getValue: (getVal) => getVal('delayed_registration_affidavit')?.otherBirthDate || '' },
    { key: 'dra_attended_by', getValue: (getVal) => getVal('delayed_registration_affidavit')?.attendedBy || '' },
    { key: 'dra_attendant_address', getValue: (getVal) => getVal('delayed_registration_affidavit')?.attendantAddress || '' },
    { key: 'dra_citizenship', getValue: (getVal) => getVal('delayed_registration_affidavit')?.citizenship || '' },
    { key: 'dra_marriage_date', getValue: (getVal) => getVal('delayed_registration_affidavit')?.marriageDate || '' },
    { key: 'dra_marriage_place', getValue: (getVal) => getVal('delayed_registration_affidavit')?.marriagePlace || '' },
    { key: 'dra_father_name', getValue: (getVal) => getVal('delayed_registration_affidavit')?.fatherName || '' },
    { key: 'dra_delay_reason', getValue: (getVal) => getVal('delayed_registration_affidavit')?.delayReason || '' },
    { key: 'dra_spouse_name', getValue: (getVal) => getVal('delayed_registration_affidavit')?.spouseName || '' },
    { key: 'dra_relationship', getValue: (getVal) => getVal('delayed_registration_affidavit')?.relationship || '' },
    { key: 'dra_affiant_signature', getValue: (getVal) => getVal('delayed_registration_affidavit')?.affiantSignature || '' },
    { key: 'dra_affixed_day', getValue: (getVal) => getVal('delayed_registration_affidavit')?.affixedDay || '' },
    { key: 'dra_affixed_month', getValue: (getVal) => getVal('delayed_registration_affidavit')?.affixedMonth || '' },
    { key: 'dra_affixed_at', getValue: (getVal) => getVal('delayed_registration_affidavit')?.affixedAt || '' },
    { key: 'dra_sworn_day', getValue: (getVal) => getVal('delayed_registration_affidavit')?.swornDay || '' },
    { key: 'dra_sworn_month', getValue: (getVal) => getVal('delayed_registration_affidavit')?.swornMonth || '' },
    { key: 'dra_sworn_year', getValue: (getVal) => getVal('delayed_registration_affidavit')?.swornYear || '' },
    { key: 'dra_sworn_at', getValue: (getVal) => getVal('delayed_registration_affidavit')?.swornAt || '' },
    { key: 'dra_ctc_no', getValue: (getVal) => getVal('delayed_registration_affidavit')?.ctcNo || '' },
    { key: 'dra_issued_on', getValue: (getVal) => getVal('delayed_registration_affidavit')?.issuedOn || '' },
    { key: 'dra_issued_at', getValue: (getVal) => getVal('delayed_registration_affidavit')?.issuedAt || '' },
    { key: 'dra_admin_officer', getValue: (getVal) => getVal('delayed_registration_affidavit')?.administeringOfficer || '' },
    { key: 'dra_name_in_print', getValue: (getVal) => getVal('delayed_registration_affidavit')?.nameInPrint || '' },
    { key: 'dra_position', getValue: (getVal) => getVal('delayed_registration_affidavit')?.position || '' },
    { key: 'dra_address', getValue: (getVal) => getVal('delayed_registration_affidavit')?.address || '' },
];

// ============================================================================
// MERGED DATA BUILDER (SRP - Single Responsibility Principle)
// ============================================================================

/**
 * Merge child and certificate data into a unified object
 * Handles both camelCase and snake_case key variations
 */
export function buildMergedCertData(child, cert) {
    if (!child) return {};

    return {
        ...cert,
        paternity_affidavit: child.paternity_affidavit || {},
        delayed_registration_affidavit: child.delayed_registration_affidavit || {},
        // For compatibility
        childFirst: cert?.childFirst ?? cert?.child_first ?? child?.first_name ?? '',
        childMiddle: cert?.childMiddle ?? cert?.child_middle ?? child?.middle_name ?? '',
        childLast: cert?.childLast ?? cert?.child_last ?? child?.last_name ?? '',
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
export function buildPdfFilename(child, cert) {
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
export function buildFieldPositionPdfBase64(merged) {
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

    // // Draw attendant type radio button marks
    // const radioPositions = {
    //     physician: { x: 282, y: 2227 },
    //     nurse: { x: 600, y: 2277 },
    //     midwife: { x: 875, y: 2277 },
    //     hilot: { x: 1179, y: 2277 },
    //     other: { x: 1794, y: 2277 },
    // };

    // if (attendantType && radioPositions[attendantType]) {
    //     const pos = radioPositions[attendantType];
    //     const xIn = (pos.x / docWidth) * pageWidthInches;
    //     const yIn = ((pos.y + 10) / docHeight) * pageHeightInches;
    //     drawRadioMark(doc, xIn, yIn);
    // }

    // Draw DRA checkboxes
    const dra = merged.delayed_registration_affidavit || {};
    const draCheckboxes = [
        { show: dra.isSelfBirth, key: 'dra_chk_self_birth' },
        { show: dra.isOtherBirth, key: 'dra_chk_other_birth' },
        { show: dra.isMarried, key: 'dra_chk_married' },
        { show: dra.isNotMarried, key: 'dra_chk_not_married' },
    ];

    draCheckboxes.forEach(cb => {
        if (cb.show && FIELD_POSITIONS[cb.key]) {
            const pos = FIELD_POSITIONS[cb.key];
            const xIn = (pos.x / docWidth) * pageWidthInches;
            const yIn = ((pos.y + 10) / docHeight) * pageHeightInches;
            drawRadioMark(doc, xIn, yIn);
        }
    });

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

let overlayMeasureContext = null;

function getOverlayMeasureContext() {
    if (typeof document === 'undefined') return null;
    if (overlayMeasureContext) return overlayMeasureContext;
    const canvas = document.createElement('canvas');
    overlayMeasureContext = canvas.getContext('2d');
    return overlayMeasureContext;
}

function countWrappedLinesForOverlay(text, widthPx, fontPx) {
    if (!text || !text.trim()) return 1;
    const ctx = getOverlayMeasureContext();
    if (!ctx) return 1;
    ctx.font = `${fontPx}px ${FONT_FAMILY}`;

    const lines = String(text).split(/\r?\n/);
    let totalLines = 0;

    for (const sourceLine of lines) {
        if (!sourceLine) {
            totalLines += 1;
            continue;
        }
        const words = sourceLine.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            totalLines += 1;
            continue;
        }

        let currentLine = '';
        let lineCount = 1;
        for (const word of words) {
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(candidate).width <= widthPx) {
                currentLine = candidate;
                continue;
            }

            if (!currentLine) {
                let segment = '';
                for (const char of word) {
                    const nextSegment = segment + char;
                    if (ctx.measureText(nextSegment).width <= widthPx) {
                        segment = nextSegment;
                    } else {
                        lineCount += 1;
                        segment = char;
                    }
                }
                currentLine = segment;
            } else {
                lineCount += 1;
                currentLine = word;
            }
        }

        totalLines += lineCount;
    }

    return totalLines;
}

function pickOverlayFontPxForColumn(text, maxWidthPx, preferredPx) {
    if (!maxWidthPx || maxWidthPx <= 0) return preferredPx;
    const value = text == null ? '' : String(text);
    if (!value.trim()) return preferredPx;

    const minFontPx = Math.min(preferredPx, OVERLAY_MIN_SHRINK_FONT_PX);
    let bestPx = preferredPx;
    let minLines = Infinity;
    for (let px = preferredPx; px >= minFontPx; px -= OVERLAY_SHRINK_STEP_PX) {
        const count = countWrappedLinesForOverlay(value, maxWidthPx, px);
        if (count < minLines) {
            minLines = count;
            bestPx = px;
        } else if (count === minLines) {
            bestPx = Math.max(bestPx, px);
        }
    }
    return bestPx;
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

    // // Draw attendant type radio button marks
    // const radioPositions = {
    //     physician: { x: 282, y: 2227 },
    //     nurse: { x: 600, y: 2277 },
    //     midwife: { x: 875, y: 2277 },
    //     hilot: { x: 1179, y: 2277 },
    //     other: { x: 1794, y: 2277 },
    // };

    // if (attendantType && radioPositions[attendantType]) {
    //     const pos = radioPositions[attendantType];
    //     const xIn = (pos.x / docWidth) * pageWidthInches;
    //     const yIn = ((pos.y + 10) / docHeight) * pageHeightInches;
    //     drawRadioMark(doc, xIn, yIn);
    // }

    // Draw DRA checkboxes
    const dra = merged.delayed_registration_affidavit || {};
    const draCheckboxes = [
        { show: dra.isSelfBirth, key: 'dra_chk_self_birth' },
        { show: dra.isOtherBirth, key: 'dra_chk_other_birth' },
        { show: dra.isMarried, key: 'dra_chk_married' },
        { show: dra.isNotMarried, key: 'dra_chk_not_married' },
    ];

    draCheckboxes.forEach(cb => {
        if (cb.show && FIELD_POSITIONS[cb.key]) {
            const pos = FIELD_POSITIONS[cb.key];
            const xIn = (pos.x / docWidth) * pageWidthInches;
            const yIn = ((pos.y + 10) / docHeight) * pageHeightInches;
            drawRadioMark(doc, xIn, yIn);
        }
    });

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
                const text = toCobDisplay(String(value || ''));
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

    let fontPx = PDF_LAYOUT.fieldFontSize;
    if (fieldKey === 'informant_address' && lenForFont >= INFORMANT_ADDRESS_COMPACT_LENGTH) {
        fontPx = INFORMANT_ADDRESS_COMPACT_OVERLAY_PX;
    } else if (fieldKey === 'attendant_address') {
        fontPx = getAttendantAddressFontPx(lenForFont);
    }

    const isCentered = CENTERED_FIELD_KEYS.includes(fieldKey);
    const colW = getEffectiveColumnWidthPx(fieldKey);
    const boxWidth = field.width ?? colW ?? undefined;
    const useWrap = boxWidth != null;
    const usableWidth = boxWidth != null ? Math.max(1, boxWidth - OVERLAY_HORIZONTAL_PADDING_PX) : null;
    if (usableWidth != null) {
        fontPx = pickOverlayFontPxForColumn(display, usableWidth, fontPx);
    }

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

export function FieldPositionBack() {
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
            if (result?.ok) {
                toast.success('PDF saved.');
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
            if (result?.ok) {
                toast.success('Combined PDF with checklist saved.');
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
                    {/* DRA Checkboxes */}
                    <RadioMark x={500} y={2500} show={getVal('delayed_registration_affidavit')?.isSelfBirth} />
                    <RadioMark x={500} y={2600} show={getVal('delayed_registration_affidavit')?.isOtherBirth} />
                    <RadioMark x={1400} y={3000} show={getVal('delayed_registration_affidavit')?.isMarried} />
                    <RadioMark x={500} y={3100} show={getVal('delayed_registration_affidavit')?.isNotMarried} />

                    {/* Paternity Affidavit Fields */}
                    <PositionedValue fieldKey="pa_mother_name" value={getVal('paternity_affidavit')?.motherName} />
                    <PositionedValue fieldKey="pa_father_name" value={getVal('paternity_affidavit')?.fatherName} />
                    <PositionedValue fieldKey="pa_child_name" value={getVal('paternity_affidavit')?.childName} />
                    <PositionedValue fieldKey="pa_dob" value={getVal('paternity_affidavit')?.dob} />
                    <PositionedValue fieldKey="pa_pob" value={getVal('paternity_affidavit')?.pob} />
                    <PositionedValue fieldKey="pa_father_signature_name" value={getVal('paternity_affidavit')?.fatherSignatureName} />
                    <PositionedValue fieldKey="pa_mother_signature_name" value={getVal('paternity_affidavit')?.motherSignatureName} />
                    <PositionedValue fieldKey="pa_sworn_day" value={getVal('paternity_affidavit')?.swornDay} />
                    <PositionedValue fieldKey="pa_sworn_month" value={getVal('paternity_affidavit')?.swornMonth} />
                    <PositionedValue fieldKey="pa_sworn_year" value={getVal('paternity_affidavit')?.swornYear} />
                    <PositionedValue fieldKey="pa_sworn_by_1" value={getVal('paternity_affidavit')?.swornBy1} />
                    <PositionedValue fieldKey="pa_sworn_by_2" value={getVal('paternity_affidavit')?.swornBy2} />
                    <PositionedValue fieldKey="pa_ctc_no" value={getVal('paternity_affidavit')?.ctcNo} />
                    <PositionedValue fieldKey="pa_issued_on" value={getVal('paternity_affidavit')?.issuedOn} />
                    <PositionedValue fieldKey="pa_issued_at" value={getVal('paternity_affidavit')?.issuedAt} />
                    <PositionedValue fieldKey="pa_admin_officer" value={getVal('paternity_affidavit')?.administeringOfficer} />
                    <PositionedValue fieldKey="pa_name_in_print" value={getVal('paternity_affidavit')?.nameInPrint} />
                    <PositionedValue fieldKey="pa_position" value={getVal('paternity_affidavit')?.position} />
                    <PositionedValue fieldKey="pa_address" value={getVal('paternity_affidavit')?.address} />

                    {/* Delayed Registration Affidavit Fields */}
                    <PositionedValue fieldKey="dra_affiant_name" value={getVal('delayed_registration_affidavit')?.affiantName} />
                    <PositionedValue fieldKey="dra_marital_status" value={getVal('delayed_registration_affidavit')?.maritalStatus} />
                    <PositionedValue fieldKey="dra_residence" value={getVal('delayed_registration_affidavit')?.residence} />
                    <PositionedValue fieldKey="dra_self_birth_place" value={getVal('delayed_registration_affidavit')?.selfBirthPlace} />
                    <PositionedValue fieldKey="dra_self_birth_date" value={getVal('delayed_registration_affidavit')?.selfBirthDate} />
                    <PositionedValue fieldKey="dra_other_birth_name" value={getVal('delayed_registration_affidavit')?.otherBirthName} />
                    <PositionedValue fieldKey="dra_other_birth_place" value={getVal('delayed_registration_affidavit')?.otherBirthPlace} />
                    <PositionedValue fieldKey="dra_other_birth_date" value={getVal('delayed_registration_affidavit')?.otherBirthDate} />
                    <PositionedValue fieldKey="dra_attended_by" value={getVal('delayed_registration_affidavit')?.attendedBy} />
                    <PositionedValue fieldKey="dra_attendant_address" value={getVal('delayed_registration_affidavit')?.attendantAddress} />
                    <PositionedValue fieldKey="dra_citizenship" value={getVal('delayed_registration_affidavit')?.citizenship} />
                    <PositionedValue fieldKey="dra_marriage_date" value={getVal('delayed_registration_affidavit')?.marriageDate} />
                    <PositionedValue fieldKey="dra_marriage_place" value={getVal('delayed_registration_affidavit')?.marriagePlace} />
                    <PositionedValue fieldKey="dra_father_name" value={getVal('delayed_registration_affidavit')?.fatherName} />
                    <PositionedValue fieldKey="dra_delay_reason" value={getVal('delayed_registration_affidavit')?.delayReason} />
                    <PositionedValue fieldKey="dra_spouse_name" value={getVal('delayed_registration_affidavit')?.spouseName} />
                    <PositionedValue fieldKey="dra_relationship" value={getVal('delayed_registration_affidavit')?.relationship} />
                    <PositionedValue fieldKey="dra_affiant_signature" value={getVal('delayed_registration_affidavit')?.affiantSignature} />
                    <PositionedValue fieldKey="dra_affixed_day" value={getVal('delayed_registration_affidavit')?.affixedDay} />
                    <PositionedValue fieldKey="dra_affixed_month" value={getVal('delayed_registration_affidavit')?.affixedMonth} />
                    <PositionedValue fieldKey="dra_affixed_at" value={getVal('delayed_registration_affidavit')?.affixedAt} />
                    <PositionedValue fieldKey="dra_sworn_day" value={getVal('delayed_registration_affidavit')?.swornDay} />
                    <PositionedValue fieldKey="dra_sworn_month" value={getVal('delayed_registration_affidavit')?.swornMonth} />
                    <PositionedValue fieldKey="dra_sworn_year" value={getVal('delayed_registration_affidavit')?.swornYear} />
                    <PositionedValue fieldKey="dra_sworn_at" value={getVal('delayed_registration_affidavit')?.swornAt} />
                    <PositionedValue fieldKey="dra_ctc_no" value={getVal('delayed_registration_affidavit')?.ctcNo} />
                    <PositionedValue fieldKey="dra_issued_on" value={getVal('delayed_registration_affidavit')?.issuedOn} />
                    <PositionedValue fieldKey="dra_issued_at" value={getVal('delayed_registration_affidavit')?.issuedAt} />
                    <PositionedValue fieldKey="dra_admin_officer" value={getVal('delayed_registration_affidavit')?.administeringOfficer} />
                    <PositionedValue fieldKey="dra_name_in_print" value={getVal('delayed_registration_affidavit')?.nameInPrint} />
                    <PositionedValue fieldKey="dra_position" value={getVal('delayed_registration_affidavit')?.position} />
                    <PositionedValue fieldKey="dra_address" value={getVal('delayed_registration_affidavit')?.address} />
                </div>
            </div>
        </>
    );
}
