import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import {
  AUSF_PDF_PAGE_FORMAT,
  buildAusfPdfBase64,
  buildAusfSuggestedFilename,
} from '../../utils/ausfPdf';
import { buildAusfPrintData } from '../../utils/buildAusfPrintData';
import { onPdfSavedOpenInBrowser } from '../../utils/openSavedPdfInBrowser';
import Ausf06, { AUSF_06_PRINT_TYPE } from './Ausf1';
import Ausf0717, { AUSF_0717_PRINT_TYPE } from './ausf2';
import AusfOnly, { AUSF_ONLY_PRINT_TYPE } from './ausf3';

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
  const [paperSize, setPaperSize] = useState(AUSF_PDF_PAGE_FORMAT.LONG);
  const docArticleRef = useRef(null);

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
    const el = docArticleRef.current?.querySelector('.print-doc');
    if (!el) {
      toast.error('Could not find the document to export.');
      return;
    }
    setSavingPdf(true);
    try {
      const base64 = await buildAusfPdfBase64(el, paperSize);
      if (!base64) {
        toast.error('Could not generate PDF.');
        return;
      }
      const suggestedFilename = buildAusfSuggestedFilename(child, variant, paperSize);
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (result?.ok) {
        await onPdfSavedOpenInBrowser(result.filePath, 'AUSF PDF');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save PDF.');
    } finally {
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

  const missingColb = !cert || !Object.keys(cert).length;

  const printPageSizeCss =
    paperSize === AUSF_PDF_PAGE_FORMAT.A4 ? 'A4' : '8.5in 13in';

  return (
    <section className="ausf-print-page min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        @media print {
          @page {
            size: ${printPageSizeCss};
            margin: 0.35in;
          }
        }
      `}</style>
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
                onClick={handlePrint}
                disabled={!printData || missingColb || savingPdf}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleSavePdf}
                disabled={!printData || missingColb || savingPdf}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPdf ? 'Saving…' : 'Save PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <article ref={docArticleRef} className="mx-auto print:mx-0 print:max-w-none">
        {printData ? <Component data={printData} /> : null}
      </article>
    </section>
  );
}
