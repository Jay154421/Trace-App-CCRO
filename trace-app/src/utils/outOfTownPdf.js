import { WITNESS_PDF_PAGE_FORMAT, buildWitnessPdfBase64, buildWitnessSuggestedFilename } from './witnessPdf';

export const OUT_OF_TOWN_PDF_PAGE_FORMAT = WITNESS_PDF_PAGE_FORMAT;

export { buildWitnessPdfBase64 as buildOutOfTownPdfBase64 };

export function buildOutOfTownSuggestedFilename(child, pageFormat = OUT_OF_TOWN_PDF_PAGE_FORMAT.LONG) {
  const base = buildWitnessSuggestedFilename(child, pageFormat);
  return base.replace(/^Witness-Affidavit-/, 'Out-of-Town-Affidavit-');
}
