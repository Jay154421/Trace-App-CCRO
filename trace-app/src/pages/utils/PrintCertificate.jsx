import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Header from "../../layouts/pdf/header.jsx";
import Certification from "../../layouts/pdf/body.jsx";
import Footer from "../../layouts/pdf/footer.jsx";
import { childrenApi } from "../../services/api";
import { usePdfPreviewUrl } from "../../hooks/usePdfPreviewUrl";
import {
  buildCertificationLetterPdfBase64,
  buildDelayedCertificationPayload,
} from "../../utils/certificationPdf";

export function PrintCertificate() {
  const { id } = useParams();
  const [child, setChild] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingPurpose, setSavingPurpose] = useState(false);
  const {
    url: pdfPreviewUrl,
    isOpen: pdfPreviewOpen,
    openPreview,
    closePreview,
  } = usePdfPreviewUrl();

  const certificateReferenceImageSrc =
    cert?.certificateReferenceImage || cert?.certificate_reference_image || null;
  const certificationPurpose = String(
    cert?.certificationPurpose ?? cert?.certification_purpose ?? cert?.purpose ?? "ANY LEGAL",
  );
  const requestPerson = String(
    cert?.requestPerson ?? cert?.request_person ?? cert?.informantName ?? cert?.informant_name ?? "",
  );

  const purposeOptions = useMemo(() => {
    const seen = new Set();
    const merged = [];
    const add = (value) => {
      const normalized = String(value || "");
      if (!normalized) return;
      const key = normalized.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(normalized);
    };
    (Array.isArray(cert?.certificationPurposeOptions)
      ? cert.certificationPurposeOptions
      : []
    ).forEach(add);
    add(certificationPurpose);
    add("ANY LEGAL");
    return merged;
  }, [cert, certificationPurpose]);

  const requestPersonOptions = useMemo(() => {
    const seen = new Set();
    const merged = [];
    const add = (value) => {
      const normalized = String(value || "");
      if (!normalized) return;
      const key = normalized.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(normalized);
    };
    (Array.isArray(cert?.requestPersonOptions) ? cert.requestPersonOptions : []).forEach(add);
    add(requestPerson);
    return merged;
  }, [cert, requestPerson]);

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
      const normalized = String(value ?? "");
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
      const normalized = String(value ?? "");
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
  ]);

  const handlePreviewPdf = useCallback(async () => {
    if (!child) {
      toast.error("Applicant data is not loaded.");
      return;
    }
    try {
      const base64 = await buildCertificationLetterPdfBase64(child, cert);
      if (!base64) {
        toast.error("Could not generate PDF.");
        return;
      }
      openPreview(base64);
    } catch (err) {
      toast.error(err?.message || "Failed to generate PDF.");
    }
  }, [child, cert, openPreview]);

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
              title="Field position PDF preview"
              className="min-h-[70vh] w-full flex-1 border-0 bg-slate-100"
            />
          </div>
        </div>
      )}

      <div className="mx-auto min-h-screen max-w-4xl bg-slate-50 p-4 sm:p-8 print:p-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            to={`/children/${id}`}
            className="text-sm font-medium text-emerald-600"
          >
            ← Back to Applicant
          </Link>
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Preview PDF
          </button>
        </div>
        {savingPurpose && (
          <p className="mb-3 text-xs font-medium text-emerald-600 print:hidden">
            Saving certification purpose...
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
            purposeOptions={purposeOptions}
            onPurposeChange={updateCertificationPurpose}
            editableRequestPerson={requestPerson}
            requestPersonOptions={requestPersonOptions}
            onRequestPersonChange={updateRequestPerson}
          />
          <Footer />
        </div>
      </div>
    </>
  );
}
