import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePdfPreviewUrl } from '../../hooks/usePdfPreviewUrl';
import { childrenApi } from '../../services/api';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { getAusfPageDimensions, useAusfPrintPageSize } from '../../hooks/useAusfPrintPageSize';
import {
  AUSF_PDF_PAGE_FORMAT,
  applyAusfBodyFit,
  buildAusfPdfBase64,
  buildAusfSuggestedFilename,
  clearAusfFitForPdfCapture,
} from '../../utils/ausfPdf';
import { buildAusfPrintData } from '../../utils/buildAusfPrintData';
import {
  buildAusfPrintPath,
  getAusfVariantForChild,
  shouldShowAusfForChild,
} from '../../utils/ausfVariant';
import { notifyElectronSavePdfResult } from '../../utils/notifyElectronSavePdfResult';
import { onPdfSavedOpenInBrowser } from '../../utils/openSavedPdfInBrowser';
import Ausf06, { AUSF_06_PRINT_TYPE } from './ausf1';
import Ausf0717, { AUSF_0717_PRINT_TYPE } from './ausf2';
import AusfOnly, { AUSF_ONLY_PRINT_TYPE } from './ausf3';

/** Scale body only so header stays top and contact footer stays at page bottom. */
function fitAusfDocToArticle(article, doc) {
  clearAusfFitForPdfCapture(doc);
  const body = doc.querySelector('.print-doc-body, .ausf-doc-body');
  if (!body) {
    const pageHeight = article.clientHeight;
    const pageWidth = article.clientWidth;
    if (!pageHeight || !pageWidth) return;
    const scale = Math.min(1, pageHeight / doc.scrollHeight, pageWidth / doc.scrollWidth);
    doc.style.zoom = scale < 1 ? String(scale) : '';
    return;
  }
  applyAusfBodyFit(article, doc);
}

/** Scale document content so it fits the selected bond paper (A4 or long). */
function useAusfFitToPaper(docArticleRef, paperSize, printData) {
  useLayoutEffect(() => {
    const article = docArticleRef.current;
    const doc = article?.querySelector('.ausf-doc.print-doc');
    const body = doc?.querySelector('.print-doc-body, .ausf-doc-body');
    if (!article || !doc) return undefined;

    const fit = () => {
      if (document.body.classList.contains('pdf-capture')) return;
      fitAusfDocToArticle(article, doc);
    };

    fit();
    const frameId = requestAnimationFrame(fit);
    const observer = new ResizeObserver(() => requestAnimationFrame(fit));
    observer.observe(doc);
    if (body) observer.observe(body);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      clearAusfFitForPdfCapture(doc);
    };
  }, [docArticleRef, paperSize, printData]);
}

function waitForAusfLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/** Clear screen zoom and apply transform fit before rasterize. */
async function prepareAusfPdfCapture(articleRef) {
  const article = articleRef.current;
  const doc = article?.querySelector('.ausf-doc.print-doc');
  if (!article || !doc) return;

  clearAusfFitForPdfCapture(doc);
  await waitForAusfLayout();
  applyAusfBodyFit(article, doc);
  await waitForAusfLayout();
}

const VARIANTS = {
  [AUSF_06_PRINT_TYPE]: {
    Component: Ausf06,
    title: 'AUSF — Child (0–6 years)',
    description: 'Affidavit filed by parent or guardian for a child aged 0–6.',
  },
  [AUSF_0717_PRINT_TYPE]: {
    Component: Ausf0717,
    title: 'AUSF — Minor (7–17 years)',
    description: 'Affidavit with sworn attestation for a minor aged 7–17.',
  },
  [AUSF_ONLY_PRINT_TYPE]: {
    Component: AusfOnly,
    title: 'AUSF — Adult (self)',
    description: 'Affidavit for the registrant (18 years or older).',
  },
};

export function AusfPrint({ variant }) {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const config = VARIANTS[variant];

  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [paperSize, setPaperSize] = useState(AUSF_PDF_PAGE_FORMAT.A4);
  const docArticleRef = useRef(null);
  const {
    url: pdfPreviewUrl,
    isOpen: pdfPreviewOpen,
    openPreview,
    closePreview,
  } = usePdfPreviewUrl();

  useAusfPrintPageSize(paperSize, variant);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    childrenApi
      .get(id)
      .then(setChild)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const cert = useMemo(() => {
    const raw = child?.certificate_of_live_birth;
    return raw && typeof raw === 'object' ? raw : {};
  }, [child]);

  const printData = useMemo(() => {
    if (!child) return null;
    return buildAusfPrintData(child, cert);
  }, [child, cert]);

  useAusfFitToPaper(docArticleRef, paperSize, printData);

  const handlePrint = useCallback(() => {
    if (!printData) {
      toast.error('Applicant data is not loaded.');
      return;
    }
    if (!cert || !Object.keys(cert).length) {
      toast.error('Complete the Certificate of Live Birth form first — AUSF fields are filled from that record.');
      return;
    }
    window.print();
  }, [printData, cert]);

  const handlePreviewPdf = useCallback(async () => {
    if (!printData) {
      toast.error('Applicant data is not loaded.');
      return;
    }
    if (!cert || !Object.keys(cert).length) {
      toast.error('Complete the Certificate of Live Birth form first — AUSF fields are filled from that record.');
      return;
    }
    const article = docArticleRef.current;
    if (!article?.querySelector('.print-doc')) {
      toast.error('Could not find the document to export.');
      return;
    }
    setPreviewingPdf(true);
    document.body.classList.add('pdf-capture');
    try {
      await waitForAusfLayout();
      await prepareAusfPdfCapture(docArticleRef);
      const base64 = await buildAusfPdfBase64(article, paperSize);
      if (!base64) {
        toast.error('Could not generate PDF.');
        return;
      }
      openPreview(base64);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate PDF.');
    } finally {
      document.body.classList.remove('pdf-capture');
      const doc = article?.querySelector('.ausf-doc.print-doc');
      if (article && doc) fitAusfDocToArticle(article, doc);
      setPreviewingPdf(false);
    }
  }, [printData, cert, paperSize, openPreview]);

  const handleSavePdf = useCallback(async () => {
    if (!printData) {
      toast.error('Applicant data is not loaded.');
      return;
    }
    if (!cert || !Object.keys(cert).length) {
      toast.error('Complete the Certificate of Live Birth form first — AUSF fields are filled from that record.');
      return;
    }
    if (!window.electron?.saveFieldPositionPdf) {
      toast.error('Save PDF is available in the desktop app.');
      return;
    }
    const article = docArticleRef.current;
    if (!article?.querySelector('.print-doc')) {
      toast.error('Could not find the document to export.');
      return;
    }
    setSavingPdf(true);
    document.body.classList.add('pdf-capture');
    try {
      await waitForAusfLayout();
      await prepareAusfPdfCapture(docArticleRef);
      const base64 = await buildAusfPdfBase64(article, paperSize);
      if (!base64) {
        toast.error('Could not generate PDF.');
        return;
      }
      const suggestedFilename = buildAusfSuggestedFilename(child, variant, paperSize);
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (notifyElectronSavePdfResult(result)) {
        onPdfSavedOpenInBrowser(result.filePath, 'AUSF PDF');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save PDF.');
    } finally {
      document.body.classList.remove('pdf-capture');
      const doc = article?.querySelector('.ausf-doc.print-doc');
      if (article && doc) fitAusfDocToArticle(article, doc);
      setSavingPdf(false);
    }
  }, [printData, cert, child, variant, paperSize]);

  if (!config) {
    return (
      <p className="p-6 text-red-800">
        Unknown AUSF form type.
        <Link to={applicantDetailPath(basePath, id)} className="ml-2 text-emerald-600 underline">
          Back to applicant
        </Link>
      </p>
    );
  }

  const { Component, title, description } = config;

  if (loading) return <p className="p-6 text-slate-500">Loading…</p>;
  if (error) {
    return (
      <p className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error.message || 'Failed to load applicant.'}
      </p>
    );
  }

  if (child && !shouldShowAusfForChild(child)) {
    return (
      <p className="m-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        AUSF is not required when parents are married — attach the marriage contract instead.
        <Link to={applicantDetailPath(basePath, id)} className="ml-2 font-medium text-emerald-600 underline">
          Back to applicant
        </Link>
      </p>
    );
  }

  const expectedVariant = child ? getAusfVariantForChild(child) : null;
  if (child && expectedVariant && variant !== expectedVariant) {
    return <Navigate to={buildAusfPrintPath(basePath, id, expectedVariant)} replace />;
  }

  const missingColb = !cert || !Object.keys(cert).length;

  const { width: pageWidth, height: pageHeight } = getAusfPageDimensions(paperSize);

  const actionsDisabled = !printData || missingColb || savingPdf || previewingPdf;

  return (
    <section className="ausf-print-page min-h-screen bg-slate-100 print:bg-white">
      {pdfPreviewOpen && pdfPreviewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ausf-pdf-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closePreview}
            aria-label="Close PDF preview"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id="ausf-pdf-preview-title" className="text-sm font-semibold text-slate-800">
                PDF preview — {title}
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
              title={`${title} PDF preview`}
              className="min-h-[70vh] w-full flex-1 border-0 bg-slate-100"
            />
          </div>
        </div>
      ) : null}

      <header className="print:hidden mx-auto max-w-[210mm] px-4 py-4">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to applicant
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            <p className="mt-2 text-xs text-slate-500">
              Data is loaded from the saved{' '}
              <Link to={`${basePath}/${id}/certificate-of-live-birth`} className="font-medium text-emerald-600 hover:underline">
                Certificate of Live Birth
              </Link>
              .
            </p>
            {missingColb ? (
              <p className="mt-2 text-sm font-medium text-amber-700">
                No Certificate of Live Birth saved yet — open the form and save before printing.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">Paper size</legend>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-800">
                <span className="font-medium text-slate-600">Size</span>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="ausf-paper-size"
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={paperSize === AUSF_PDF_PAGE_FORMAT.A4}
                    onChange={() => setPaperSize(AUSF_PDF_PAGE_FORMAT.A4)}
                  />
                  A4
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="ausf-paper-size"
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={paperSize === AUSF_PDF_PAGE_FORMAT.LONG}
                    onChange={() => setPaperSize(AUSF_PDF_PAGE_FORMAT.LONG)}
                  />
                  Long (8.5 in × 13 in)
                </label>
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePreviewPdf}
                disabled={actionsDisabled}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewingPdf ? 'Generating…' : 'Preview PDF'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={actionsDisabled}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleSavePdf}
                disabled={actionsDisabled}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPdf ? 'Saving…' : 'Save PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <article
        ref={docArticleRef}
        className="mx-auto mb-8 print:mx-0 print:mb-0"
        style={{ width: pageWidth, height: pageHeight, maxHeight: pageHeight, overflow: 'hidden' }}
      >
        {printData ? <Component data={printData} /> : null}
      </article>
    </section>
  );
}
