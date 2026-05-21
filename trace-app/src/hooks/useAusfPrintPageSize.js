import { useEffect } from 'react';
import { AUSF_PDF_PAGE_FORMAT } from '../utils/ausfPdf';
import { AUSF_0717_PRINT_TYPE } from '../pages/utils/ausf2';

export const AUSF_PRINT_SIZE_STYLE_ID = 'ausf-print-paper-size';

export function getAusfPageDimensions(paperSize) {
  const isA4 = paperSize === AUSF_PDF_PAGE_FORMAT.A4;
  return {
    pageSizeCss: isA4 ? '210mm 297mm' : '8.5in 13in',
    width: isA4 ? '210mm' : '8.5in',
    height: isA4 ? '297mm' : '13in',
    dataPaper: isA4 ? 'a4' : 'long',
  };
}

/** Injects @page + flex layout for `.ausf-print-page` (AUSF, witness affidavit, etc.). */
export function useAusfPrintPageSize(paperSize, variant = null) {
  useEffect(() => {
    const { pageSizeCss, width, height, dataPaper } = getAusfPageDimensions(paperSize);
    const isA4Minor = paperSize === AUSF_PDF_PAGE_FORMAT.A4 && variant === AUSF_0717_PRINT_TYPE;
    const docPadding = isA4Minor ? '0.12in 1in 0.3in' : '0.3in 1in';
    document.documentElement.dataset.paperSize = dataPaper;

    let el = document.getElementById(AUSF_PRINT_SIZE_STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = AUSF_PRINT_SIZE_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = `
      @media print {
        @page { size: ${pageSizeCss}; margin: 0; }
        .ausf-print-page > article {
          width: ${width} !important;
          height: ${height} !important;
          max-height: ${height} !important;
          margin: 0 auto !important;
          overflow: hidden !important;
        }
        .ausf-print-page .ausf-doc.print-doc {
          width: ${width} !important;
          max-width: ${width} !important;
          height: ${height} !important;
          min-height: ${height} !important;
          max-height: ${height} !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          padding: ${docPadding} !important;
        }
        .ausf-print-page .ausf-doc.print-doc .print-doc-header,
        .ausf-print-page .ausf-doc.print-doc .ausf-doc-header {
          flex: 0 0 auto !important;
          margin-top: 0 !important;
          display: block !important;
          visibility: visible !important;
        }
        .ausf-print-page .ausf-doc.print-doc > .print-doc-body,
        .ausf-print-page .ausf-doc.print-doc > .ausf-doc-body {
          flex: 1 1 0% !important;
          min-height: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .ausf-print-page .ausf-doc.print-doc .print-doc-footer-wrap,
        .ausf-print-page .ausf-doc.print-doc .ausf-doc-footer {
          flex: 0 0 auto !important;
          margin-top: auto !important;
          margin-bottom: 0 !important;
          width: 100% !important;
        }
        .ausf-print-page .ausf-doc.print-doc .print-doc-footer {
          margin-top: 0 !important;
        }
      }
      html[data-paper-size] .ausf-print-page > article {
        width: ${width};
        height: ${height};
        max-height: ${height};
        overflow: hidden;
      }
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc {
        width: ${width} !important;
        max-width: ${width} !important;
        height: ${height} !important;
        min-height: ${height} !important;
        max-height: ${height} !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        padding: ${docPadding} !important;
      }
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc .print-doc-header,
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc .ausf-doc-header {
        flex: 0 0 auto !important;
        margin-top: 0 !important;
        display: block !important;
        visibility: visible !important;
      }
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc > .print-doc-body,
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc > .ausf-doc-body {
        overflow: hidden !important;
      }
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc > .print-doc-body,
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc > .ausf-doc-body {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc .print-doc-footer-wrap,
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc .ausf-doc-footer {
        flex: 0 0 auto !important;
        margin-top: auto !important;
        margin-bottom: 0 !important;
        width: 100% !important;
      }
      html[data-paper-size] .ausf-print-page .ausf-doc.print-doc .print-doc-footer {
        margin-top: 0 !important;
      }
      @media screen {
        html[data-paper-size] .witness-affidavit-print.ausf-print-page > article {
          height: auto !important;
          max-height: none !important;
          min-height: ${height} !important;
          overflow: visible !important;
        }
        html[data-paper-size] .witness-affidavit-print.ausf-print-page .ausf-doc.print-doc {
          height: 100% !important;
          min-height: ${height} !important;
          max-height: none !important;
          overflow: visible !important;
        }
        html[data-paper-size] .witness-affidavit-print.ausf-print-page .ausf-doc.print-doc > .print-doc-body,
        html[data-paper-size] .witness-affidavit-print.ausf-print-page .ausf-doc.print-doc > .ausf-doc-body {
          flex: 1 1 0% !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: visible !important;
        }
        html[data-paper-size] .witness-affidavit-print.ausf-print-page .ausf-doc.print-doc .registrar-signature-zone {
          margin-top: auto !important;
        }
      }
      body.pdf-capture .ausf-print-page > article {
        width: ${width} !important;
        height: ${height} !important;
        max-height: ${height} !important;
        overflow: hidden !important;
      }
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc {
        width: ${width} !important;
        max-width: ${width} !important;
        height: ${height} !important;
        min-height: ${height} !important;
        max-height: ${height} !important;
        overflow: hidden !important;
        padding: ${docPadding} !important;
      }
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc .print-doc-header,
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc .ausf-doc-header {
        flex: 0 0 auto !important;
        display: block !important;
        visibility: visible !important;
      }
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc > .print-doc-body,
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc > .ausf-doc-body {
        overflow: hidden !important;
        flex: 1 1 0% !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc .print-doc-footer-wrap,
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc .ausf-doc-footer {
        flex: 0 0 auto !important;
        margin-top: auto !important;
        margin-bottom: 0 !important;
        width: 100% !important;
      }
      body.pdf-capture .ausf-print-page .ausf-doc.print-doc .print-doc-footer {
        margin-top: 0 !important;
      }
    `;

    document.body.classList.remove('ausf-paper-a4', 'ausf-paper-long');
    document.body.classList.add(dataPaper === 'a4' ? 'ausf-paper-a4' : 'ausf-paper-long');

    return () => {
      delete document.documentElement.dataset.paperSize;
      document.body.classList.remove('ausf-paper-a4', 'ausf-paper-long', 'pdf-capture');
    };
  }, [paperSize, variant]);
}
