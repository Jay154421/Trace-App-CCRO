import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../services/api';

const isElectron = typeof window !== 'undefined' && window.electron?.isElectron;

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
    province: { x: 96, y: 477},
    city_municipality: { x: 96, y: 636 },
    registry_no: { x: 1634, y: 477, width: 774, height: 132 },
    child_name_first: { x: 301, y: 873, width: 602, height: 132 },
    child_name_middle: { x: 946, y: 873, width: 602, height: 132 },
    child_name_last: { x: 1591, y: 873, width: 774, height: 132 },
    sex: { x: 86, y: 1059, width: 688, height: 132 },
    date_of_birth_day: { x: 860, y: 1059, width: 344, height: 132 },
    date_of_birth_month: { x: 1246, y: 1059, width: 516, height: 132 },
    date_of_birth_year: { x: 1806, y: 1059, width: 516, height: 132 },
    place_of_birth_hospital: { x: 86, y: 1244, width: 1118, height: 132 },
    place_of_birth_city: { x: 1246, y: 1244, width: 602, height: 132 },
    place_of_birth_province: { x: 1892, y: 1244, width: 559, height: 132 },
    type_of_birth: { x: 86, y: 1430, width: 774, height: 132 },
    multiple_birth_order: { x: 903, y: 1430, width: 774, height: 132 },
    birth_order: { x: 1720, y: 1430, width: 516, height: 132 },
    weight_at_birth: { x: 2236, y: 1430, width: 258, height: 132 },
    mother_maiden_first: { x: 301, y: 1667, width: 602, height: 132 },
    mother_maiden_middle: { x: 946, y: 1667, width: 602, height: 132 },
    mother_maiden_last: { x: 1591, y: 1667, width: 774, height: 132 },
    mother_citizenship: { x: 86, y: 1853, width: 860, height: 132 },
    mother_religion: { x: 989, y: 1853, width: 860, height: 132 },
    mother_occupation: { x: 1892, y: 1853, width: 602, height: 132 },
    mother_age: { x: 2064, y: 2012, width: 387, height: 132 },
    mother_residence_house: { x: 86, y: 2171, width: 860, height: 132 },
    mother_residence_city: { x: 989, y: 2171, width: 688, height: 132 },
    mother_residence_province: { x: 1720, y: 2171, width: 774, height: 132 },
    father_name_first: { x: 301, y: 2383, width: 602, height: 132 },
    father_name_middle: { x: 946, y: 2383, width: 602, height: 132 },
    father_name_last: { x: 1591, y: 2383, width: 774, height: 132 },
    father_citizenship: { x: 86, y: 2569, width: 860, height: 132 },
    father_religion: { x: 989, y: 2569, width: 860, height: 132 },
    father_occupation: { x: 1892, y: 2569, width: 602, height: 132 },
    father_residence_house: { x: 86, y: 2755, width: 860, height: 132 },
    father_residence_city: { x: 989, y: 2755, width: 688, height: 132 },
    father_residence_province: { x: 1720, y: 2755, width: 774, height: 132 },
    marriage_date: { x: 86, y: 2994, width: 860, height: 132 },
    marriage_place_city: { x: 989, y: 2994, width: 688, height: 132 },
    marriage_place_province: { x: 1720, y: 2994, width: 774, height: 132 },
    attendant_type: { x: 86, y: 3205, width: 1290, height: 132 },
    attendant_signature: { x: 86, y: 3391, width: 860, height: 132 },
    attendant_address: { x: 989, y: 3391, width: 774, height: 132 },
    attendant_date: { x: 1806, y: 3391, width: 602, height: 132 },
    informant_signature: { x: 86, y: 3603, width: 860, height: 132 },
    informant_relation: { x: 989, y: 3603, width: 688, height: 132 },
    informant_address: { x: 1720, y: 3603, width: 774, height: 132 },
    prepared_by: { x: 86, y: 3815, width: 860, height: 132 },
    registered_by: { x: 1290, y: 3815, width: 1118, height: 132 },
  },
};

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
  { key: 'mother_occupation', valueKey: 'motherOccupation' },
  { key: 'mother_age', valueKey: 'motherAge' },
  { key: 'mother_residence_house', valueKey: 'motherResidenceLine1' },
  { key: 'mother_residence_city', valueKey: 'motherResidenceCity' },
  { key: 'mother_residence_province', valueKey: 'motherResidenceProvince' },
  { key: 'father_name_first', valueKey: 'fatherFirst' },
  { key: 'father_name_middle', valueKey: 'fatherMiddle' },
  { key: 'father_name_last', valueKey: 'fatherLast' },
  { key: 'father_citizenship', valueKey: 'fatherCitizenship' },
  { key: 'father_religion', valueKey: 'fatherReligion' },
  { key: 'father_occupation', valueKey: 'fatherOccupation' },
  { key: 'father_residence_house', valueKey: 'fatherResidenceLine1' },
  { key: 'father_residence_city', valueKey: 'fatherResidenceCity' },
  { key: 'father_residence_province', valueKey: 'fatherResidenceProvince' },
  { key: 'marriage_date', getValue: (f) => [f('marriageMonth'), f('marriageDay'), f('marriageYear')].filter(Boolean).join(' / ') },
  { key: 'marriage_place_city', valueKey: 'marriagePlaceCity' },
  { key: 'marriage_place_province', valueKey: 'marriagePlaceProvince' },
  { key: 'attendant_type', valueKey: 'attendantType' },
  { key: 'attendant_signature', getValue: (f) => f('attendantSignature') || f('attendantName') },
  { key: 'attendant_address', valueKey: 'attendantAddress' },
  { key: 'attendant_date', valueKey: 'attendantDate' },
  { key: 'informant_signature', getValue: (f) => f('informantSignature') || f('informantName') },
  { key: 'informant_relation', valueKey: 'informantRelationship' },
  { key: 'informant_address', valueKey: 'informantAddress' },
  { key: 'prepared_by', getValue: (f) => f('preparedBySignature') || f('preparedByName') },
  { key: 'registered_by', getValue: (f) => f('registeredBySignature') || f('registeredByName') },
];

// Font size chosen so that at print scale (0.32) text is readable (~10pt equivalent)
const POSITIONED_FONT_SIZE = 32;

function PositionedValue({ fieldKey, value }) {
  const field = LAYOUT.fields[fieldKey];
  if (!field) return null;
  const display = value === '' || value === undefined || value === null ? '' : String(value);
  return (
    <span
      className="absolute overflow-hidden"
      style={{
        left: field.x,
        top: field.y,
        width: field.width,
        height: field.height,
        fontFamily: FONT_FAMILY,
        fontSize: `${POSITIONED_FONT_SIZE}px`,
        padding: '2px 4px',
        color: COLORS.black,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
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

function getMergedCert(child, cert) {
  if (!cert || typeof cert !== 'object') return {};
  const birth = child?.date_of_birth ? parseDateOfBirth(child.date_of_birth) : {};
  return {
    ...cert,
    childFirst: cert.childFirst ?? cert.child_first ?? child?.first_name ?? '',
    childMiddle: cert.childMiddle ?? cert.child_middle ?? child?.middle_name ?? '',
    childLast: cert.childLast ?? cert.child_last ?? child?.last_name ?? '',
    birthDay: cert.birthDay ?? cert.birth_day ?? birth.day ?? '',
    birthMonth: cert.birthMonth ?? cert.birth_month ?? birth.month ?? '',
    birthYear: cert.birthYear ?? cert.birth_year ?? birth.year ?? '',
  };
}

// Build PDF from merged cert data so content is guaranteed in the file (no print capture)
function buildFieldPositionPdfBase64(merged) {
  const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const f = (camelKey) => merged[camelKey] ?? merged[camelToSnake(camelKey)];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'legal' });
  doc.setFont('helvetica');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const W = LAYOUT.document.width;
  const H = LAYOUT.document.height;
  const pageW = 8.5;
  const pageH = 14;
  const yOffset = 0.08; // small offset from top of cell for baseline

  for (const item of FIELD_VALUE_MAP) {
    const field = LAYOUT.fields[item.key];
    if (!field) continue;
    const value = item.getValue ? item.getValue(f) : f(item.valueKey);
    const str = value === '' || value === undefined || value === null ? '' : String(value);
    const xIn = (field.x / W) * pageW;
    const yIn = ((field.y + 25) / H) * pageH;
    doc.text(str, xIn, yIn);
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

  const handleSavePdf = async () => {
    if (!window.electron?.saveFieldPositionPdf) return;
    try {
      const merged = getMergedCert(child, cert);
      const base64 = buildFieldPositionPdfBase64(merged);
      const result = await window.electron.saveFieldPositionPdf(base64);
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

  return (
    <>
      <div className="mb-4 flex items-center justify-between print-hide">
        <Link to={`/children/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to applicant</Link>
        <div className="flex items-center gap-2">
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
          <PositionedValue fieldKey="place_of_birth_hospital" value={f('placeOfBirthName')} />
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
          <PositionedValue fieldKey="mother_occupation" value={f('motherOccupation')} />
          <PositionedValue fieldKey="mother_age" value={f('motherAge')} />
          <PositionedValue fieldKey="mother_residence_house" value={f('motherResidenceLine1')} />
          <PositionedValue fieldKey="mother_residence_city" value={f('motherResidenceCity')} />
          <PositionedValue fieldKey="mother_residence_province" value={f('motherResidenceProvince')} />
          <PositionedValue fieldKey="father_name_first" value={f('fatherFirst')} />
          <PositionedValue fieldKey="father_name_middle" value={f('fatherMiddle')} />
          <PositionedValue fieldKey="father_name_last" value={f('fatherLast')} />
          <PositionedValue fieldKey="father_citizenship" value={f('fatherCitizenship')} />
          <PositionedValue fieldKey="father_religion" value={f('fatherReligion')} />
          <PositionedValue fieldKey="father_occupation" value={f('fatherOccupation')} />
          <PositionedValue fieldKey="father_residence_house" value={f('fatherResidenceLine1')} />
          <PositionedValue fieldKey="father_residence_city" value={f('fatherResidenceCity')} />
          <PositionedValue fieldKey="father_residence_province" value={f('fatherResidenceProvince')} />
          <PositionedValue
            fieldKey="marriage_date"
            value={[f('marriageMonth'), f('marriageDay'), f('marriageYear')].filter(Boolean).join(' / ')}
          />
          <PositionedValue fieldKey="marriage_place_city" value={f('marriagePlaceCity')} />
          <PositionedValue fieldKey="marriage_place_province" value={f('marriagePlaceProvince')} />
          <PositionedValue fieldKey="attendant_type" value={f('attendantType')} />
          <PositionedValue fieldKey="attendant_signature" value={f('attendantSignature') || f('attendantName')} />
          <PositionedValue fieldKey="attendant_address" value={f('attendantAddress')} />
          <PositionedValue fieldKey="attendant_date" value={f('attendantDate')} />
          <PositionedValue fieldKey="informant_signature" value={f('informantSignature') || f('informantName')} />
          <PositionedValue fieldKey="informant_relation" value={f('informantRelationship')} />
          <PositionedValue fieldKey="informant_address" value={f('informantAddress')} />
          <PositionedValue fieldKey="prepared_by" value={f('preparedBySignature') || f('preparedByName')} />
          <PositionedValue fieldKey="registered_by" value={f('registeredBySignature') || f('registeredByName')} />
        </div>
      </div>
    </>
  );
}
