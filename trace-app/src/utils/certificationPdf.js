import { jsPDF } from 'jspdf';

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const DEFAULT_SIGNATORY_NAME = 'PHOEBE L. BENIGA';
const DEFAULT_SIGNATORY_TITLE = 'REGISTRATION OFFICER II';

function resolvePublicAssetUrl(filename) {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${String(filename || '').replace(/^\/+/, '')}`;
}

async function fetchImageDataUrl(filename) {
  const url = resolvePublicAssetUrl(filename);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load image: ${filename}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read image: ${filename}`));
    reader.readAsDataURL(blob);
  });
}

function ordinalDay(n) {
  const d = Number(n);
  if (!Number.isFinite(d)) return '';
  const j = d % 10;
  const k = d % 100;
  if (j === 1 && k !== 11) return `${d}ST`;
  if (j === 2 && k !== 12) return `${d}ND`;
  if (j === 3 && k !== 13) return `${d}RD`;
  return `${d}TH`;
}

function padTwo(n) {
  const num = Number(n);
  return Number.isFinite(num) ? String(num).padStart(2, '0') : '';
}

function parseIsoBirth(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(isoStr.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function upperJoin(parts, sep = ' ') {
  const s = parts
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(sep)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return s || '';
}

function buildPlaceUpper(cert, child) {
  const c = cert && typeof cert === 'object' ? cert : {};
  const name = c.placeOfBirthName ?? c.place_of_birth_name;
  const city = c.placeOfBirthCity ?? c.place_of_birth_city;
  const prov = c.placeOfBirthProvince ?? c.place_of_birth_province;
  const segments = [name, city, prov].filter((x) => x && String(x).trim());
  if (segments.length) return upperJoin(segments, ', ');
  const fallback = child?.place_of_birth;
  return fallback && String(fallback).trim() ? String(fallback).trim().toUpperCase() : '';
}

/**
 * Canonical copy payload for Delayed Registration certification (letter + PDF).
 */
export function buildDelayedCertificationPayload(child, cert) {
  const c = cert && typeof cert === 'object' ? cert : {};
  const iso = parseIsoBirth(child?.date_of_birth);
  const monthNum = Number(c.birthMonth ?? c.birth_month) || iso?.month;
  const dayNum = Number(c.birthDay ?? c.birth_day) || iso?.day;
  const yearNum = Number(c.birthYear ?? c.birth_year) || iso?.year;

  let birthDateLine = '';
  if (
    monthNum >= 1 &&
    monthNum <= 12 &&
    Number.isFinite(dayNum) &&
    Number.isFinite(yearNum)
  ) {
    birthDateLine = `${MONTH_NAMES[monthNum - 1]} ${padTwo(dayNum)}, ${yearNum}`;
  }

  const childName = upperJoin([
    c.childFirst ?? c.child_first ?? child?.first_name,
    c.childMiddle ?? c.child_middle ?? child?.middle_name,
    c.childLast ?? c.child_last ?? child?.last_name,
  ]);

  const motherName = upperJoin([
    c.motherFirst ?? c.mother_first,
    c.motherMiddle ?? c.mother_middle,
    c.motherLast ?? c.mother_last,
  ]);
  const fatherName = upperJoin([
    c.fatherFirst ?? c.father_first,
    c.fatherMiddle ?? c.father_middle,
    c.fatherLast ?? c.father_last,
  ]);

  const informantRaw = (
    (c.informantName ?? c.informant_name ?? '') + ''
  ).trim();
  const requestPerson =
    upperJoin([informantRaw]) ||
    fatherName ||
    motherName ||
    '';

  const issued = new Date();
  const issuedDayOrdinal = ordinalDay(issued.getDate());
  const issuedMonthUpper = MONTH_NAMES[issued.getMonth()];
  const issuedYearStr = String(issued.getFullYear());

  return {
    childName,
    birthDateLine,
    placeOfBirth: buildPlaceUpper(c, child),
    motherName,
    fatherName,
    requestPerson,
    purpose: 'ANY LEGAL',
    processStatus: 'UNDER PROCESS',
    issuedDayOrdinal,
    issuedMonthUpper,
    issuedYearStr,
    signatoryName: DEFAULT_SIGNATORY_NAME,
    signatoryTitle: DEFAULT_SIGNATORY_TITLE,
  };
}

async function loadCertificateHeaderImages() {
  try {
    const [leftSeal, rightSeal] = await Promise.all([
      fetchImageDataUrl('image-removebg-preview.png'),
      fetchImageDataUrl('icon.jpg'),
    ]);
    return { leftSeal, rightSeal };
  } catch {
    return { leftSeal: '', rightSeal: '' };
  }
}

function display(v) {
  const s = (v ?? '').trim();
  return s || '—';
}

function docLineHeight(doc, sizePt, factor = 1.35) {
  return ((sizePt * factor) / 72);
}

/**
 * Portrait long-sized PDF (8.5 x 13 in) matching the scanned certification format.
 */
export async function buildCertificationLetterPdfBase64(child, cert) {
  const p = buildDelayedCertificationPayload(child, cert);
  const { leftSeal, rightSeal } = await loadCertificateHeaderImages();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
  doc.setTextColor(0, 0, 0);

  const margin = 0.9;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cx = pageW / 2;
  const maxW = pageW - margin * 2;
  const bodyW = maxW - 0.35;
  let y = 0.64;

  const emitCenter = (lines, size, bold = false, lhFactor = 1.3) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lh = docLineHeight(doc, size, lhFactor);
    for (const line of lines) {
      doc.text(line, cx, y, { align: 'center' });
      y += lh;
    }
    doc.setFont('helvetica', 'normal');
  };

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.01);
  doc.line(margin, y + 0.18, pageW - margin, y + 0.18);

  // Draw header seals first so text appears centered between them.
  const sealY = y - 0.04;
  const sealSize = 0.74;
  if (leftSeal) doc.addImage(leftSeal, 'PNG', margin, sealY, sealSize, sealSize);
  if (rightSeal) doc.addImage(rightSeal, 'JPEG', pageW - margin - sealSize, sealY, sealSize, sealSize);

  emitCenter(['Republic of the Philippines'], 10, false);
  emitCenter(["CITY CIVIL REGISTRAR'S OFFICE"], 12, true);
  emitCenter(['City of Iligan'], 10, false);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  for (const line of doc.splitTextToSize(
    'Ground Flr., Pedro Generalao Bldg., Buhanginan Hill, Pala-o, Iligan City',
    maxW,
  )) {
    doc.text(line, cx, y, { align: 'center' });
    y += docLineHeight(doc, 8.5, 1.2);
  }
  y += 0.18;

  emitCenter(['CERTIFICATION'], 20, true, 1.1);
  y += 0.16;

  const childN = display(p.childName);
  const dob = display(p.birthDateLine);
  const pob = display(p.placeOfBirth);
  const mom = display(p.motherName);
  const dad = display(p.fatherName);
  const req = display(p.requestPerson);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TO WHOM IT MAY CONCERN:', margin, y);
  y += docLineHeight(doc, 12, 1.45);

  const emitWrapped = (text, size = 11, bold = false, extraGap = 0.16) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lh = docLineHeight(doc, size, 1.45);
    for (const line of doc.splitTextToSize(text, bodyW)) {
      doc.text(line, margin, y);
      y += lh;
    }
    doc.setFont('helvetica', 'normal');
    y += extraGap;
  };

  emitWrapped(
    `This is to certify that the application for Delayed Registration of Birth in favor of ${childN} alleged to have been born on ${dob} at ${pob} to parents ${mom} and ${dad} is ${p.processStatus} in this office.`,
  );
  emitWrapped(
    `This certification is issued upon the request of ${req} for ${p.purpose} requirement purposes.`,
  );
  emitWrapped(
    `Issued this ${display(p.issuedDayOrdinal)} day of ${display(p.issuedMonthUpper)} ${display(p.issuedYearStr)} in Iligan City, Philippines.`,
  );

  const footerStartY = pageH - margin - 0.55;
  const signatureTopLimit = footerStartY - 1.65;
  y = Math.min(y + 0.24, signatureTopLimit);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(p.signatoryName, cx, y, { align: 'center' });
  y += docLineHeight(doc, 12, 1.25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const line of doc.splitTextToSize(p.signatoryTitle, bodyW)) {
    doc.text(line, cx, y, { align: 'center' });
    y += docLineHeight(doc, 10, 1.15);
  }

  y = footerStartY;
  doc.setFontSize(7.6);
  const footerLh = docLineHeight(doc, 8, 1.4);
  for (const line of [
    'CONTACT DETAILS:',
    'Telephone No.: (063) 224-5038',
    'Email: civilregistrar.iligan@gmail.com',
  ]) {
    doc.text(line, margin, y);
    y += footerLh;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text('Be counted', pageW - margin, pageH - margin - 0.32, { align: 'right' });
  doc.text('Get REGISTERED!', pageW - margin, pageH - margin - 0.14, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  const dataUri = doc.output('datauristring');
  return dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] : '';
}
