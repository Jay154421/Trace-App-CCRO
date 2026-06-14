import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePdfPreviewUrl } from '../../hooks/usePdfPreviewUrl';
import { getAusfPageDimensions, useAusfPrintPageSize } from '../../hooks/useAusfPrintPageSize';
import { childrenApi } from '../../services/api';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { AUSF_PDF_PAGE_FORMAT } from '../../utils/ausfPdf';
import { notifyElectronSavePdfResult } from '../../utils/notifyElectronSavePdfResult';
import { onPdfSavedOpenInBrowser } from '../../utils/openSavedPdfInBrowser';
import {
  WITNESS_PDF_PAGE_FORMAT,
  applyAusfBodyFit,
  buildWitnessPdfBase64,
  buildWitnessSuggestedFilename,
  clearAusfFitForPdfCapture,
} from '../../utils/witnessPdf';
import WitnessPrintDocument from './witnessPrintDocument';
import { WitnessAffidavit } from './WitnessAffidavit';

function fitWitnessDocToArticle(article, doc) {
  clearAusfFitForPdfCapture(doc);
  applyAusfBodyFit(article, doc);
}

function useWitnessFitToPaper(docArticleRef, paperSize, printData, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const article = docArticleRef.current;
    const doc = article?.querySelector('.ausf-doc.print-doc');
    const body = doc?.querySelector('.print-doc-body, .ausf-doc-body');
    if (!article || !doc) return undefined;

    const fit = () => {
      if (document.body.classList.contains('pdf-capture')) return;
      fitWitnessDocToArticle(article, doc);
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
  }, [docArticleRef, paperSize, printData, enabled]);
}

function waitForWitnessLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function prepareWitnessPdfCapture(articleRef) {
  const article = articleRef.current;
  const doc = article?.querySelector('.ausf-doc.print-doc');
  if (!article || !doc) return;
  clearAusfFitForPdfCapture(doc);
  await waitForWitnessLayout();
  applyAusfBodyFit(article, doc);
  await waitForWitnessLayout();
}

export function WitnessPrint() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [paperSize, setPaperSize] = useState(WITNESS_PDF_PAGE_FORMAT.A4);
  const docArticleRef = useRef(null);
  const {
    url: pdfPreviewUrl,
    isOpen: pdfPreviewOpen,
    openPreview,
    closePreview,
  } = usePdfPreviewUrl();

  useAusfPrintPageSize(paperSize);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    childrenApi
      .get(id)
      .then(setChild)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const printData = useMemo(() => {
    const stored = child?.witness_affidavit;
    return stored && typeof stored === 'object' ? stored : {};
  }, [child]);

  useWitnessFitToPaper(docArticleRef, paperSize, printData, !isEditing);

  const refreshChild = useCallback(() => {
    if (!id) return;
    childrenApi.get(id).then(setChild).catch(() => {});
  }, [id]);

  const handleCloseEdit = useCallback(() => {
    setIsEditing(false);
    refreshChild();
  }, [refreshChild]);

  const handlePrint = useCallback(() => {
    if (!child) {
      toast.error('Applicant data is not loaded.');
      return;
    }
    window.print();
  }, [child]);

  const runPdfExport = useCallback(async () => {
    const article = docArticleRef.current;
    if (!article?.querySelector('.print-doc')) {
      toast.error('Could not find the document to export.');
      return null;
    }
    document.body.classList.add('pdf-capture');
    try {
      await waitForWitnessLayout();
      await prepareWitnessPdfCapture(docArticleRef);
      return await buildWitnessPdfBase64(article, paperSize);
    } finally {
      document.body.classList.remove('pdf-capture');
      const doc = article?.querySelector('.ausf-doc.print-doc');
      if (article && doc) fitWitnessDocToArticle(article, doc);
    }
  }, [paperSize]);

  const handlePreviewPdf = useCallback(async () => {
    if (!child) {
      toast.error('Applicant data is not loaded.');
      return;
    }
    setPreviewingPdf(true);
    try {
      const base64 = await runPdfExport();
      if (!base64) {
        toast.error('Could not generate PDF.');
        return;
      }
      openPreview(base64);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate PDF.');
    } finally {
      setPreviewingPdf(false);
    }
  }, [child, runPdfExport, openPreview]);

  const handleSavePdf = useCallback(async () => {
    if (!child) {
      toast.error('Applicant data is not loaded.');
      return;
    }
    if (!window.electron?.saveFieldPositionPdf) {
      toast.error('Save PDF is available in the desktop app.');
      return;
    }
    setSavingPdf(true);
    try {
      const base64 = await runPdfExport();
      if (!base64) {
        toast.error('Could not generate PDF.');
        return;
      }
      const suggestedFilename = buildWitnessSuggestedFilename(child, paperSize);
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (notifyElectronSavePdfResult(result)) {
        onPdfSavedOpenInBrowser(result.filePath, 'Witness affidavit PDF');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save PDF.');
    } finally {
      setSavingPdf(false);
    }
  }, [child, paperSize, runPdfExport]);

  if (loading) return <p className="p-6 text-slate-500">Loading…</p>;
  if (error) {
    return (
      <p className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error.message || 'Failed to load applicant.'}
      </p>
    );
  }

  const { width: pageWidth } = getAusfPageDimensions(paperSize);
  const actionsDisabled = !child || savingPdf || previewingPdf || isEditing;

  return (
    <section className="witness-affidavit-print ausf-print-page min-h-screen bg-slate-100 print:bg-white">
      {pdfPreviewOpen && pdfPreviewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="witness-pdf-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closePreview}
            aria-label="Close PDF preview"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id="witness-pdf-preview-title" className="text-sm font-semibold text-slate-800">
                PDF preview — Two Witnesses Affidavit
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
              title="Witness affidavit PDF preview"
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
            <h1 className="text-lg font-semibold text-slate-800">Affidavit of Two Witnesses</h1>
            <p className="mt-1 text-sm text-slate-600">For late registration of birth (Legal Office).</p>
            <p className="mt-2 text-xs text-slate-500">
              {isEditing
                ? 'Edit the fields below. Changes save automatically. Click View document when finished.'
                : 'Use Edit form to fill in fields, then preview or save as PDF.'}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">Paper size</legend>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-800">
                <span className="font-medium text-slate-600">Size</span>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="witness-paper-size"
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={paperSize === AUSF_PDF_PAGE_FORMAT.A4}
                    onChange={() => setPaperSize(WITNESS_PDF_PAGE_FORMAT.A4)}
                  />
                  A4
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="witness-paper-size"
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={paperSize === WITNESS_PDF_PAGE_FORMAT.LONG}
                    onChange={() => setPaperSize(WITNESS_PDF_PAGE_FORMAT.LONG)}
                  />
                  Long (8.5 in × 13 in)
                </label>
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View document
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit form
                </button>
              )}
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

      {isEditing ? (
        <div className="mx-auto mb-8 max-w-4xl print:hidden">
          <WitnessAffidavit embedded onClose={handleCloseEdit} />
        </div>
      ) : (
        <article ref={docArticleRef} className="mx-auto mb-8 print:mx-0 print:mb-0" style={{ width: pageWidth }}>
          <WitnessPrintDocument data={printData} />
        </article>
      )}
    </section>
  );
}
