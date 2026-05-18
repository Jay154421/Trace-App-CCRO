import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MM_TO_INCH = 1 / 25.4;

/** @typedef {'a4' | 'long'} AusfPdfPageFormat */

export const AUSF_PDF_PAGE_FORMAT = {
  LONG: 'long',
  A4: 'a4',
};

const VARIANT_FILENAME_SLUG = {
  'ausf-0-6': '0-6',
  'ausf-07-17': '7-17',
  'ausf-only': 'Adult',
};

/**
 * @param {AusfPdfPageFormat | string | undefined} format
 * @returns {[number, number]} width and height in inches (portrait)
 */
export function getAusfPdfPageSizeInches(format) {
  if (format === AUSF_PDF_PAGE_FORMAT.A4) {
    return [210 * MM_TO_INCH, 297 * MM_TO_INCH];
  }
  return [8.5, 13];
}

const PDF_MARGIN_IN = 0.2;

/**
 * Capture an AUSF print document element and return base64 PDF (Long or A4).
 * Entire document is scaled to fit on exactly one page (no multi-page tiling).
 * @param {HTMLElement} element — root `.print-doc` node
 * @param {AusfPdfPageFormat | string} [pageFormat]
 * @returns {Promise<string>}
 */
export async function buildAusfPdfBase64(element, pageFormat = AUSF_PDF_PAGE_FORMAT.LONG) {
  if (!element) return '';

  const [pageWIn, pageHIn] = getAusfPdfPageSizeInches(pageFormat);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: [pageWIn, pageHIn],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxW = pageWidth - 2 * PDF_MARGIN_IN;
  const maxH = pageHeight - 2 * PDF_MARGIN_IN;

  const aspect = canvas.width / canvas.height;
  let drawW = maxW;
  let drawH = drawW / aspect;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * aspect;
  }

  const x = PDF_MARGIN_IN + (maxW - drawW) / 2;
  const y = PDF_MARGIN_IN + (maxH - drawH) / 2;

  doc.addImage(imgData, 'JPEG', x, y, drawW, drawH);

  const dataUri = doc.output('datauristring');
  return dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] : '';
}

/**
 * @param {object} child — applicant record
 * @param {string} variant — AUSF_06_PRINT_TYPE | AUSF_0717_PRINT_TYPE | AUSF_ONLY_PRINT_TYPE
 * @param {AusfPdfPageFormat | string} [pageFormat]
 */
export function buildAusfSuggestedFilename(child, variant, pageFormat = AUSF_PDF_PAGE_FORMAT.LONG) {
  const parts = [child?.last_name, child?.first_name, child?.middle_name].filter(
    (p) => p && String(p).trim(),
  );
  const rawName = parts.join(' ');
  const sanitized =
    rawName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) ||
    'Applicant';
  const slug = VARIANT_FILENAME_SLUG[variant] || 'AUSF';
  const sizeLabel = pageFormat === AUSF_PDF_PAGE_FORMAT.A4 ? 'A4' : 'Long';
  return `AUSF-${slug}-${sizeLabel}-${sanitized}.pdf`;
}
