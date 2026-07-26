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

/** Document includes 1in padding; export fills the page edge-to-edge */
const PDF_MARGIN_IN = 0;

const PDF_CAPTURE_CLASS = 'ausf-pdf-capture';

/**
 * CSS zoom breaks html2canvas text layout (overlapping glyphs). Clear screen fit before rasterizing.
 * @param {HTMLElement | null} printDoc
 */
export function clearAusfFitForPdfCapture(printDoc) {
  if (!printDoc) return;
  printDoc.style.zoom = '';
  const body = printDoc.querySelector('.print-doc-body, .ausf-doc-body');
  if (!body) return;
  body.style.zoom = '';
  body.style.transform = '';
  body.style.transformOrigin = '';
  body.style.width = '';
  body.style.maxWidth = '';
  body.style.overflow = '';
  delete body.dataset.ausfPdfFit;
}

/**
 * @param {HTMLElement} article
 * @param {HTMLElement} printDoc
 * @returns {number}
 */
export function computeAusfBodyFitScale(article, printDoc) {
  const header = printDoc.querySelector('.print-doc-header, .ausf-doc-header');
  const footer = printDoc.querySelector('.print-doc-footer-wrap, .ausf-doc-footer');
  const body = printDoc.querySelector('.print-doc-body, .ausf-doc-body');
  if (!body) return 1;

  const docStyle = getComputedStyle(printDoc);
  const padY =
    (parseFloat(docStyle.paddingTop) || 0) + (parseFloat(docStyle.paddingBottom) || 0);
  const headerH = header?.offsetHeight ?? 0;
  const footerH = footer?.offsetHeight ?? 0;
  const availableH = Math.max(0, article.clientHeight - padY - headerH - footerH);
  const availableW = article.clientWidth;

  return Math.min(1, availableH / body.scrollHeight, availableW / body.scrollWidth);
}

/**
 * Scale body to fit between header and footer. Uses top-left origin + width compensation
 * so left/right edges align with the footer (center origin leaves side gaps).
 * @param {HTMLElement | null | undefined} article
 * @param {HTMLElement | null | undefined} printDoc
 * @returns {number}
 */
export function applyAusfBodyFit(article, printDoc) {
  if (!article || !printDoc) return 1;
  const body = printDoc.querySelector('.print-doc-body, .ausf-doc-body');
  if (!body) return 1;

  body.style.transform = '';
  body.style.transformOrigin = '';
  body.style.width = '';
  body.style.maxWidth = '';
  delete body.dataset.ausfPdfFit;

  const scale = computeAusfBodyFitScale(article, printDoc);
  if (scale >= 1) {
    body.style.overflow = '';
    return 1;
  }

  body.dataset.ausfPdfFit = '1';
  body.style.overflow = 'hidden';
  body.style.transformOrigin = 'top left';
  body.style.width = `${100 / scale}%`;
  body.style.maxWidth = 'none';
  body.style.transform = `scale(${scale})`;
  return scale;
}

/** @deprecated Use applyAusfBodyFit */
export function applyAusfBodyFitForPdfCapture(article, printDoc) {
  return applyAusfBodyFit(article, printDoc);
}

/**
 * @param {Document} clonedDoc
 * @param {HTMLElement} clonedRoot
 */
function prepareAusfPdfClone(clonedDoc, clonedRoot) {
  const clonedPrintDoc =
    clonedRoot.classList?.contains('print-doc')
      ? clonedRoot
      : clonedRoot.querySelector?.('.ausf-doc.print-doc');
  if (!clonedPrintDoc) return;

  clonedPrintDoc.classList.add(PDF_CAPTURE_CLASS);
  clonedPrintDoc.style.zoom = '';
  clonedPrintDoc.style.overflow = 'visible';
  if (clonedPrintDoc.closest('article')) {
    clonedPrintDoc.style.height = '100%';
    clonedPrintDoc.style.minHeight = '100%';
  }

  const clonedBody = clonedPrintDoc.querySelector('.print-doc-body, .ausf-doc-body');
  if (clonedBody) {
    clonedBody.style.zoom = '';
    if (!clonedBody.dataset.ausfPdfFit) {
      clonedBody.style.transform = '';
      clonedBody.style.overflow = 'visible';
    }
  }

  const clonedArticle = clonedPrintDoc.closest('article');
  if (clonedArticle) clonedArticle.style.overflow = 'visible';

  clonedDoc.body?.classList.add('pdf-capture');
}

/**
 * Taller variants (e.g. 7–17 with sworn attestation) overflow the page frame once fit zoom is cleared.
 * @param {HTMLElement | null | undefined} printDoc
 * @param {HTMLElement | null | undefined} article
 */
function shouldCaptureFullScrollHeight(printDoc, article) {
  if (!printDoc || !article) return false;
  const body = printDoc.querySelector('.print-doc-body, .ausf-doc-body');
  if (!body) return false;
  if (body.dataset.ausfPdfFit) return false;
  const header = printDoc.querySelector('.print-doc-header, .ausf-doc-header');
  const footer = printDoc.querySelector('.print-doc-footer-wrap, .ausf-doc-footer');
  const docStyle = getComputedStyle(printDoc);
  const padY =
    (parseFloat(docStyle.paddingTop) || 0) + (parseFloat(docStyle.paddingBottom) || 0);
  const headerH = header?.offsetHeight ?? 0;
  const footerH = footer?.offsetHeight ?? 0;
  const availableH = Math.max(0, article.clientHeight - padY - headerH - footerH);
  return body.scrollHeight > availableH + 2;
}

/**
 * Capture an AUSF print document and return base64 PDF (Long or A4).
 * Rasterizes without CSS zoom, then scales the image to fit one page (preserves aspect).
 * @param {HTMLElement} element — page `article` or root `.print-doc` node
 * @param {AusfPdfPageFormat | string} [pageFormat]
 * @returns {Promise<string>}
 */
export async function buildAusfPdfBase64(element, pageFormat = AUSF_PDF_PAGE_FORMAT.LONG) {
  if (!element) return '';

  const [pageWIn, pageHIn] = getAusfPdfPageSizeInches(pageFormat);

  const printDoc =
    element.classList?.contains('print-doc')
      ? element
      : element.querySelector?.('.ausf-doc.print-doc');
  const article = printDoc?.closest('article') ?? (element.tagName === 'ARTICLE' ? element : null);
  /** Page frame (article) keeps footer pinned; scrollHeight capture leaves footer mid-page on short forms. */
  const captureRoot = article ?? printDoc ?? element;
  const capturePageFrame = captureRoot === article && article;

  clearAusfFitForPdfCapture(printDoc);

  if (printDoc && article) {
    applyAusfBodyFit(article, printDoc);
  }

  const prevDocHeight = printDoc?.style.height ?? '';
  const prevDocMinHeight = printDoc?.style.minHeight ?? '';
  if (printDoc && article) {
    printDoc.style.height = '100%';
    printDoc.style.minHeight = '100%';
  }

  if (article) article.style.overflow = 'visible';
  const prevDocOverflow = printDoc?.style.overflow ?? '';
  const prevRootOverflow = captureRoot.style.overflow ?? '';
  if (printDoc) printDoc.style.overflow = 'visible';
  captureRoot.style.overflow = 'visible';

  if (printDoc?.classList) printDoc.classList.add(PDF_CAPTURE_CLASS);

  const width = Math.round(captureRoot.offsetWidth || captureRoot.clientWidth);
  const usePageFrameHeight =
    capturePageFrame && !shouldCaptureFullScrollHeight(printDoc, article);
  const height = Math.round(
    usePageFrameHeight
      ? captureRoot.clientHeight
      : Math.max(captureRoot.scrollHeight, captureRoot.clientHeight, captureRoot.offsetHeight),
  );

  let canvas;
  try {
    canvas = await html2canvas(captureRoot, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: width || undefined,
      height: height || undefined,
      windowWidth: width || undefined,
      windowHeight: height || undefined,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedNode) => {
        prepareAusfPdfClone(clonedDoc, clonedNode);
      },
    });
  } finally {
    if (printDoc?.classList) printDoc.classList.remove(PDF_CAPTURE_CLASS);
    clearAusfFitForPdfCapture(printDoc);
    if (printDoc) {
      printDoc.style.overflow = prevDocOverflow;
      printDoc.style.height = prevDocHeight;
      printDoc.style.minHeight = prevDocMinHeight;
    }
    captureRoot.style.overflow = prevRootOverflow;
    if (article) article.style.overflow = '';
  }

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
