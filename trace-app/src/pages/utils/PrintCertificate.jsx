import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { applicantDetailPath, getApplicantBasePath } from "../../utils/applicantRoutes";
import toast from "react-hot-toast";
import { notifyElectronSavePdfResult } from "../../utils/notifyElectronSavePdfResult";
import { onPdfSavedOpenInBrowser } from "../../utils/openSavedPdfInBrowser";
import Header from "../../layouts/pdf/header.jsx";
import Certification from "../../layouts/pdf/body.jsx";
import Footer from "../../layouts/pdf/footer.jsx";
import { childrenApi } from "../../services/api";
import { usePdfPreviewUrl } from "../../hooks/usePdfPreviewUrl";
import {
  buildCertificationLetterPdfBase64,
  buildDelayedCertificationPayload,
  CERTIFICATION_PDF_PAGE_FORMAT,
} from "../../utils/certificationPdf";

const SIGNATORY_OPTIONS = [
  { name: "ATTY. YUSSIF DON JUSTIN F. MARTIL, REB", title: "CITY CIVIL REGISTRAR" },
  { name: "LORELIE L. CANTO", title: "REGISTRATION OFFICER IV" },
  { name: "PHOEBE L. BENIGA", title: "REGISTRATION OFFICER II" },
  { name: "JAN FLAURENCE A. OBLENDA", title: "REGISTRATION OFFICER II" },
];

export function PrintCertificate() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [child, setChild] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingPurpose, setSavingPurpose] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const {
    url: pdfPreviewUrl,
    isOpen: pdfPreviewOpen,
    openPreview,
    closePreview,
  } = usePdfPreviewUrl();
  const [paperSize, setPaperSize] = useState(CERTIFICATION_PDF_PAGE_FORMAT.A4);

  const certificateReferenceImageSrc =
    cert?.certificateReferenceImage || cert?.certificate_reference_image || null;
  const certificationPurpose = String(
    cert?.certificationPurpose ?? cert?.certification_purpose ?? cert?.purpose ?? "ANY LEGAL",
  );
  const requestPerson = String(
    cert?.requestPerson ?? cert?.request_person ?? cert?.informantName ?? cert?.informant_name ?? "",
  );
  const selectedSignatoryName = String(
    cert?.signatoryName ?? cert?.signatory_name ?? "PHOEBE L. BENIGA",
  );
  const selectedSignatoryTitle = String(
    cert?.signatoryTitle ?? cert?.signatory_title ?? "REGISTRATION OFFICER II",
  );

  useEffect(() => {
    setLoading(true);
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const raw = data.certificate_of_live_birth;
        setCert(raw && typeof raw === "object" ? raw : {});
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const certificationCopy = useMemo(
    () => (child ? buildDelayedCertificationPayload(child, cert) : null),
    [child, cert],
  );

  const updateCertificationPurpose = useCallback(
    (value) => {
      const normalized = String(value ?? "").toUpperCase();
      setCert((prev) => {
        const current = prev && typeof prev === "object" ? prev : {};
        const existingOptions = Array.isArray(current.certificationPurposeOptions)
          ? current.certificationPurposeOptions
          : [];
        const options = [...existingOptions];
        const cleaned = normalized.trim();
        if (cleaned) {
          const exists = options.some(
            (option) => String(option || "").trim().toUpperCase() === cleaned.toUpperCase(),
          );
          if (!exists) options.push(cleaned);
        }
        return {
          ...current,
          certificationPurpose: normalized,
          certificationPurposeOptions: options,
        };
      });
    },
    [setCert],
  );

  const updateRequestPerson = useCallback(
    (value) => {
      const normalized = String(value ?? "").toUpperCase();
      setCert((prev) => {
        const current = prev && typeof prev === "object" ? prev : {};
        const existingOptions = Array.isArray(current.requestPersonOptions)
          ? current.requestPersonOptions
          : [];
        const options = [...existingOptions];
        const cleaned = normalized.trim();
        if (cleaned) {
          const exists = options.some(
            (option) => String(option || "").trim().toUpperCase() === cleaned.toUpperCase(),
          );
          if (!exists) options.push(cleaned);
        }
        return {
          ...current,
          requestPerson: normalized,
          requestPersonOptions: options,
        };
      });
    },
    [setCert],
  );

  const updateSignatory = useCallback(
    (name) => {
      const chosen = SIGNATORY_OPTIONS.find((option) => option.name === name);
      setCert((prev) => {
        const current = prev && typeof prev === "object" ? prev : {};
        return {
          ...current,
          signatoryName: name,
          signatoryTitle: chosen?.title || "",
        };
      });
    },
    [setCert],
  );

  useEffect(() => {
    if (!id || cert === null) return;
    const timeout = setTimeout(async () => {
      try {
        setSavingPurpose(true);
        await childrenApi.updateCertificateOfLiveBirth(id, cert);
      } catch (err) {
        toast.error(err?.message || "Failed to save certification purpose.");
      } finally {
        setSavingPurpose(false);
      }
    }, 700);
    return () => clearTimeout(timeout);
  }, [
    id,
    cert?.certificationPurpose,
    cert?.certificationPurposeOptions,
    cert?.requestPerson,
    cert?.requestPersonOptions,
    cert?.signatoryName,
    cert?.signatoryTitle,
  ]);

  const handlePreviewPdf = useCallback(async () => {
    if (!child) {
      toast.error("Applicant data is not loaded.");
      return;
    }
    try {
      const base64 = await buildCertificationLetterPdfBase64(child, cert, {
        format: paperSize,
      });
      if (!base64) {
        toast.error("Could not generate PDF.");
        return;
      }
      openPreview(base64);
    } catch (err) {
      toast.error(err?.message || "Failed to generate PDF.");
    }
  }, [child, cert, paperSize, openPreview]);

  const handleSavePdf = useCallback(async () => {
    if (!child) {
      toast.error("Applicant data is not loaded.");
      return;
    }
    if (!window.electron?.saveFieldPositionPdf) {
      toast.error("Save PDF is available in the desktop app.");
      return;
    }
    setSavingPdf(true);
    try {
      const base64 = await buildCertificationLetterPdfBase64(child, cert, {
        format: paperSize,
      });
      if (!base64) {
        toast.error("Could not generate PDF.");
        return;
      }
      const parts = [child.last_name, child.first_name, child.middle_name].filter(
        (p) => p && String(p).trim(),
      );
      const rawName = parts.join(" ");
      const sanitized =
        rawName.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || "Applicant";
      const formatLabel =
        paperSize === CERTIFICATION_PDF_PAGE_FORMAT.A4 ? "A4" : "Long";
      const suggestedFilename = `Certification-${sanitized}-${formatLabel}.pdf`;
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (notifyElectronSavePdfResult(result)) {
        onPdfSavedOpenInBrowser(result.filePath, "Certification PDF");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save PDF.");
    } finally {
      setSavingPdf(false);
    }
  }, [child, cert, paperSize]);

  if (loading) return <p className="text-slate-500 p-4">Loading…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error.message}
      </div>
    );
  if (cert === null) return null;

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: ${paperSize === CERTIFICATION_PDF_PAGE_FORMAT.A4 ? "A4" : '8.5in 13in'};
          }
        }
      `}</style>
      {pdfPreviewOpen && pdfPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-certificate-pdf-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closePreview}
            aria-label="Close PDF preview"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2
                id="print-certificate-pdf-preview-title"
                className="text-sm font-semibold text-slate-800"
              >
                PDF preview
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
              title="Certification letter PDF preview"
              className="min-h-[70vh] w-full flex-1 border-0 bg-slate-100"
            />
          </div>
        </div>
      )}

      <div className="mx-auto min-h-screen max-w-4xl bg-slate-50 p-4 sm:p-8 print:p-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            to={applicantDetailPath(basePath, id)}
            className="text-sm font-medium text-emerald-600"
          >
            ← Back to Applicant
          </Link>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <fieldset className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <legend className="sr-only">Paper size</legend>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Paper
              </span>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-800">
                <input
                  type="radio"
                  name="print-cert-paper"
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={paperSize === CERTIFICATION_PDF_PAGE_FORMAT.A4}
                  onChange={() => setPaperSize(CERTIFICATION_PDF_PAGE_FORMAT.A4)}
                />
                A4
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-800">
                <input
                  type="radio"
                  name="print-cert-paper"
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={paperSize === CERTIFICATION_PDF_PAGE_FORMAT.LONG}
                  onChange={() => setPaperSize(CERTIFICATION_PDF_PAGE_FORMAT.LONG)}
                />
                Long (8.5 in × 13 in)
              </label>
            </fieldset>
            <button
              type="button"
              onClick={handlePreviewPdf}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Preview PDF
            </button>
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={savingPdf}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingPdf ? "Saving…" : "Save PDF"}
            </button>
          </div>
        </div>
        {savingPurpose && (
          <p className="mb-3 text-xs font-medium text-emerald-600 print:hidden">
            Saving certificate details...
          </p>
        )}
        {certificateReferenceImageSrc && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
              Certificate Screenshot Reference
            </h2>
            <img
              src={certificateReferenceImageSrc}
              alt="Scanned certification"
              className="w-full rounded-lg border border-slate-200 object-contain"
              loading="lazy"
            />
          </div>
        )}
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 print:border-0 print:p-0 print:shadow-none">
          <Header />
          <Certification
            copy={certificationCopy}
            editablePurpose={certificationPurpose}
            onPurposeChange={updateCertificationPurpose}
            editableRequestPerson={requestPerson}
            onRequestPersonChange={updateRequestPerson}
            editableSignatoryName={selectedSignatoryName}
            editableSignatoryTitle={selectedSignatoryTitle}
            signatoryOptions={SIGNATORY_OPTIONS}
            onSignatoryChange={updateSignatory}
          />
          <Footer />
        </div>
      </div>
    </>
  );
}
