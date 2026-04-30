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

function docLineHeight(sizePt, factor = 1.35) {
  return (sizePt * factor) / 72;
}

function trimTrailingWhitespaceTokens(tokens) {
  const trimmed = [...tokens];
  while (trimmed.length && /^\s+$/.test(trimmed[trimmed.length - 1].text)) {
    trimmed.pop();
  }
  return trimmed;
}

function lineTextWidth(doc, tokens) {
  let width = 0;
  for (const token of tokens) {
    doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
    width += doc.getTextWidth(token.text);
  }
  return width;
}

function countStretchableSpaces(tokens) {
  let count = 0;
  for (const token of tokens) {
    if (/^\s+$/.test(token.text)) count += token.text.length;
  }
  return count;
}

const CM_TO_INCH = 1 / 2.54;

/**
 * Portrait long-sized PDF (8.5 x 13 in) matching the scanned certification format.
 */
export async function buildCertificationLetterPdfBase64(child, cert) {
  const payload = buildDelayedCertificationPayload(child, cert);
  const { leftSeal, rightSeal } = await loadCertificateHeaderImages();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });
  doc.setTextColor(0, 0, 0);

  // Match the same visual proportions used by the on-screen preview layout.
  const margin = 0.55;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;
  const maxContentWidth = pageW - margin * 2;
  const bodyWidth = maxContentWidth * 0.8;
  const bodyX = (pageW - bodyWidth) / 2;
  const footerStartY = pageH - margin - 0.58;
  let currentY = 0.74;

  const emitCenteredLines = (lines, size, bold = false, lineHeightFactor = 1.3) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lineHeight = docLineHeight(size, lineHeightFactor);
    for (const line of lines) {
      doc.text(line, centerX, currentY, { align: 'center' });
      currentY += lineHeight;
    }
    doc.setFont('helvetica', 'normal');
  };

  const splitStyledParagraphLines = (segments, size = 11) => {
    doc.setFontSize(size);
    const tokens = [];
    for (const segment of segments) {
      const parts = String(segment.text ?? '').split(/(\s+)/);
      for (const part of parts) {
        if (part) tokens.push({ text: part, bold: Boolean(segment.bold) });
      }
    }

    const lines = [];
    let line = [];
    let lineWidth = 0;

    const pushLine = () => {
      if (line.length) {
        lines.push(line);
        line = [];
        lineWidth = 0;
      }
    };

    for (const token of tokens) {
      doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
      const tokenWidth = doc.getTextWidth(token.text);
      const nextWidth = lineWidth + tokenWidth;

      if (nextWidth <= bodyWidth) {
        line.push(token);
        lineWidth = nextWidth;
        continue;
      }

      if (!line.length || /^\s+$/.test(token.text)) {
        continue;
      }

      pushLine();
      line.push(token);
      lineWidth = tokenWidth;
    }

    pushLine();
    return lines;
  };

  const emitStyledParagraph = (segments, size = 11, extraGap = 0.16) => {
    doc.setFontSize(size);
    const lineHeight = docLineHeight(size, 1.6);
    const lines = splitStyledParagraphLines(segments, size);
    lines.forEach((line, lineIndex) => {
      const currentLine = trimTrailingWhitespaceTokens(line);
      let x = bodyX;
      const naturalLineWidth = lineTextWidth(doc, currentLine);
      const isLastLine = lineIndex === lines.length - 1;
      const stretchableSpaces = countStretchableSpaces(currentLine);
      const extraPerSpace =
        !isLastLine && stretchableSpaces > 0 && naturalLineWidth < bodyWidth
          ? (bodyWidth - naturalLineWidth) / stretchableSpaces
          : 0;

      for (const token of currentLine) {
        doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
        doc.text(token.text, x, currentY);
        let tokenWidth = doc.getTextWidth(token.text);
        if (extraPerSpace > 0 && /^\s+$/.test(token.text)) {
          tokenWidth += extraPerSpace * token.text.length;
        }
        x += tokenWidth;
      }
      currentY += lineHeight;
    });
    doc.setFont('helvetica', 'normal');
    currentY += extraGap;
  };

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.01);
  const dividerY = currentY + 0.84;
  doc.line(margin, dividerY, pageW - margin, dividerY);

  // Draw header seals first so text appears centered between them.
  const sealY = currentY - 0.05;
  const sealSize = 0.62;
  if (leftSeal) doc.addImage(leftSeal, 'PNG', margin, sealY, sealSize, sealSize);
  if (rightSeal) doc.addImage(rightSeal, 'JPEG', pageW - margin - sealSize, sealY, sealSize, sealSize);

  emitCenteredLines(['Republic of the Philippines'], 12, true, 1.15);
  emitCenteredLines(["CITY CIVIL REGISTRAR'S OFFICE"], 14, true, 1.1);
  emitCenteredLines(['City of Iligan'], 12, true, 1.15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const line of doc.splitTextToSize(
    'Ground Flr., Pedro Generalao Bldg., Buhanginan Hill, Pala-o, Iligan City',
    maxContentWidth,
  )) {
    doc.text(line, centerX, currentY, { align: 'center' });
    currentY += docLineHeight(10, 1.15);
  }
  currentY = dividerY + 0.38;
  const certificationSectionOffsetY = 2 * CM_TO_INCH;
  currentY += certificationSectionOffsetY;

  emitCenteredLines(['CERTIFICATION'], 24, true, 1.05);
  currentY += 0.22;

  const childName = display(payload.childName);
  const dateOfBirth = display(payload.birthDateLine);
  const placeOfBirth = display(payload.placeOfBirth);
  const motherName = display(payload.motherName);
  const fatherName = display(payload.fatherName);
  const requestPerson = display(payload.requestPerson);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TO WHOM IT MAY CONCERN:', bodyX, currentY);
  currentY += docLineHeight(12, 1.45);

  const signatureNameLh = docLineHeight(14, 1.25);
  const signatureTitleLh = docLineHeight(12, 1.15);
  const signatureTitleLines = doc.splitTextToSize(payload.signatoryTitle, bodyWidth).length;
  const signatureBlockHeight = signatureNameLh + signatureTitleLines * signatureTitleLh;
  const signatureTopLimit = footerStartY - 0.2 - signatureBlockHeight;

  const certificationParagraphs = [
    [
      { text: 'This is to certify that the application for Delayed Registration of Birth in favor of ' },
      { text: childName, bold: true },
      { text: ' alleged to have been born on ' },
      { text: dateOfBirth, bold: true },
      { text: ' at ' },
      { text: placeOfBirth, bold: true },
      { text: ' to parents ' },
      { text: motherName, bold: true },
      { text: ' and ' },
      { text: fatherName, bold: true },
      { text: ' is ' },
      { text: payload.processStatus, bold: true },
      { text: ' in this office.' },
    ],
    [
      { text: 'This certification is issued upon the request of ' },
      { text: requestPerson, bold: true },
      { text: ' for ' },
      { text: payload.purpose, bold: true },
      { text: ' requirement purposes.' },
    ],
    [
      { text: 'Issued this ' },
      { text: display(payload.issuedDayOrdinal), bold: true },
      { text: ' day of ' },
      { text: display(payload.issuedMonthUpper), bold: true },
      { text: ' ' },
      { text: display(payload.issuedYearStr), bold: true },
      { text: ' in Iligan City, Philippines.' },
    ],
  ];

  const paragraphGap = 0.15;
  const paragraphLh = docLineHeight(12, 1.6);
  const projectedBodyHeight = certificationParagraphs.reduce((total, paragraphSegments) => {
    const lines = splitStyledParagraphLines(paragraphSegments, 12).length;
    return total + lines * paragraphLh + paragraphGap;
  }, 0);

  // Reduce paragraph gap when body text is long so signature/footer stays clear.
  const bodyEndLimit = signatureTopLimit - 0.24;
  if (currentY + projectedBodyHeight > bodyEndLimit) {
    const compactGap = 0.08;
    for (const paragraphSegments of certificationParagraphs) {
      emitStyledParagraph(paragraphSegments, 12, compactGap);
    }
  } else {
    for (const paragraphSegments of certificationParagraphs) {
      emitStyledParagraph(paragraphSegments, 12, paragraphGap);
    }
  }

  currentY = Math.min(currentY + 0.28, signatureTopLimit);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(payload.signatoryName, centerX, currentY, { align: 'center' });
  currentY += docLineHeight(14, 1.25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  for (const line of doc.splitTextToSize(payload.signatoryTitle, bodyWidth)) {
    doc.text(line, centerX, currentY, { align: 'center' });
    currentY += docLineHeight(12, 1.15);
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.01);
  const footerDividerY = footerStartY - 0.11;
  doc.line(margin, footerDividerY, pageW - margin, footerDividerY);
  currentY = footerStartY + 0.06;
  doc.setFontSize(10);
  const footerLh = docLineHeight(10, 1.2);
  for (const line of [
    'CONTACT DETAILS:',
    'Telephone No.: (063) 224-5038',
    'Email: civilregistrar.iligan@gmail.com',
  ]) {
    doc.text(line, bodyX, currentY);
    currentY += footerLh;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  const rightFooterX = pageW - bodyX;
  doc.text('Be counted,', rightFooterX, footerStartY + 0.11, {
    align: 'right',
    maxWidth: bodyWidth * 0.52,
  });
  doc.text('Get REGISTERED!', rightFooterX, footerStartY + 0.26, {
    align: 'right',
    maxWidth: bodyWidth * 0.52,
  });
  doc.setFont('helvetica', 'normal');

  const dataUri = doc.output('datauristring');
  return dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] : '';
}
