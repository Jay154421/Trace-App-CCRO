import {
  AUSF_PDF_PAGE_FORMAT,
  applyAusfBodyFit,
  buildAusfPdfBase64,
  clearAusfFitForPdfCapture,
  getAusfPdfPageSizeInches,
} from './ausfPdf';

export const WITNESS_PDF_PAGE_FORMAT = AUSF_PDF_PAGE_FORMAT;

export { applyAusfBodyFit, clearAusfFitForPdfCapture, getAusfPdfPageSizeInches };

export async function buildWitnessPdfBase64(element, pageFormat = WITNESS_PDF_PAGE_FORMAT.LONG) {
  return buildAusfPdfBase64(element, pageFormat);
}

export function buildWitnessSuggestedFilename(child, pageFormat = WITNESS_PDF_PAGE_FORMAT.LONG) {
  const parts = [child?.last_name, child?.first_name, child?.middle_name].filter(
    (p) => p && String(p).trim(),
  );
  const rawName = parts.join(' ');
  const sanitized =
    rawName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Applicant';
  const sizeLabel = pageFormat === WITNESS_PDF_PAGE_FORMAT.A4 ? 'A4' : 'Long';
  return `Witness-Affidavit-${sizeLabel}-${sanitized}.pdf`;
}
