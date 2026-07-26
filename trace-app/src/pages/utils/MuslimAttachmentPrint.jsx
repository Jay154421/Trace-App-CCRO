import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  buildWitnessPdfBase64,
  clearAusfFitForPdfCapture,
  WITNESS_PDF_PAGE_FORMAT,
} from '../../utils/witnessPdf';
import MuslimAttachmentPrintDocument from './muslimAttachmentPrintDocument';

const MUSLIM_PDF_PAGE_FORMAT = WITNESS_PDF_PAGE_FORMAT;

function fitMuslimDocToArticle(article, doc) {
  clearAusfFitForPdfCapture(doc);
}

function useMuslimFitToPaper(docArticleRef, paperSize, printData, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const article = docArticleRef.current;
    const doc = article?.querySelector('.muslim-attachment-doc.print-doc');
    if (!article || !doc) return undefined;

    const fit = () => {
      if (document.body.classList.contains('pdf-capture')) return;
      fitMuslimDocToArticle(article, doc);
    };

    fit();
    const frameId = requestAnimationFrame(fit);
    const observer = new ResizeObserver(() => requestAnimationFrame(fit));
    observer.observe(doc);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [docArticleRef, paperSize, printData, enabled]);
}

function waitForMuslimLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function parseDateOfBirth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { day: '', month: '', year: '' };
  const trimmed = dateStr.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (iso) {
    return { day: iso[3], month: iso[2], year: iso[1] };
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return { day: '', month: '', year: '' };
  return {
    day: String(d.getDate()),
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
  };
}

async function prepareMuslimPdfCapture(articleRef) {
  const article = articleRef.current;
  const doc = article?.querySelector('.muslim-attachment-doc.print-doc');
  if (!article || !doc) return;
  await waitForMuslimLayout();
}

export function MuslimAttachmentPrint() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [paperSize, setPaperSize] = useState(MUSLIM_PDF_PAGE_FORMAT.A4);
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
    const stored = child?.muslim_attachment;
    return stored && typeof stored === 'object' ? stored : {};
  }, [child]);

  useMuslimFitToPaper(docArticleRef, paperSize, printData, !isEditing);

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
      await waitForMuslimLayout();
      await prepareMuslimPdfCapture(docArticleRef);
      const base64 = await buildWitnessPdfBase64(article, paperSize);
      return base64;
    } finally {
      document.body.classList.remove('pdf-capture');
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
      const childName = [child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' ');
      const suggestedFilename = `MuslimAttachment_${childName || 'attachment'}_${paperSize}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, '_');
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (notifyElectronSavePdfResult(result)) {
        onPdfSavedOpenInBrowser(result.filePath, 'Muslim Attachment PDF');
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
    <section className="muslim-attachment-print ausf-print-page min-h-screen bg-slate-100 print:bg-white">
      {pdfPreviewOpen && pdfPreviewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="muslim-pdf-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closePreview}
            aria-label="Close PDF preview"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id="muslim-pdf-preview-title" className="text-sm font-semibold text-slate-800">
                PDF preview — Muslim Attachment
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
              title="Muslim Attachment PDF preview"
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
            <h1 className="text-lg font-semibold text-slate-800">Muslim Attachment</h1>
            <p className="mt-1 text-sm text-slate-600">Municipal Form No. 102 attachment</p>
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
                    name="muslim-paper-size"
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={paperSize === AUSF_PDF_PAGE_FORMAT.A4}
                    onChange={() => setPaperSize(MUSLIM_PDF_PAGE_FORMAT.A4)}
                  />
                  A4
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="muslim-paper-size"
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={paperSize === MUSLIM_PDF_PAGE_FORMAT.LONG}
                    onChange={() => setPaperSize(MUSLIM_PDF_PAGE_FORMAT.LONG)}
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
          <MuslimAttachmentEmbedded onClose={handleCloseEdit} />
        </div>
      ) : (
        <article ref={docArticleRef} className="mx-auto mb-8 print:mx-0 print:mb-0" style={{ width: pageWidth }}>
          <MuslimAttachmentPrintDocument data={printData} />
        </article>
      )}
    </section>
  );
}

const ETHNICITY_SUGGESTIONS = [
  'MARANAO', 'MAGUINDANAO', 'TAUSUG', 'YAKAN', 'SAMAL',
  'BANGSA MORO', 'IRANON', 'KALAGAN', 'SANGIL', 'MUSLIM',
  'BICOLANO', 'CEBUANO', 'HILIGAYNON', 'ILOCANO', 'KAPAMPANGAN',
  'PANGASINENSE', 'TAGALOG', 'WARAY',
];

const RELATIONSHIP_SUGGESTIONS = [
  'FATHER', 'MOTHER', 'GUARDIAN', 'GRANDFATHER', 'GRANDMOTHER',
  'BROTHER', 'SISTER', 'UNCLE', 'AUNT', 'COUSIN', 'NEPHEW', 'NIECE',
  'MYSELF', 'INFORMANT',
];

const NOT_APPLICABLE_LABEL = 'NOT APPLICABLE';

function asUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function getAutocompleteLabelSuggestions(query, suggestionOptions, maxRows = 40, includeNotApplicable = true) {
  const q = String(query || '').trim().toUpperCase();
  const base = Array.isArray(suggestionOptions) ? suggestionOptions : [];
  const mergedSuggestionOptions = includeNotApplicable ? [...base, NOT_APPLICABLE_LABEL] : base;

  if (!q) {
    const seen = new Set();
    const out = [];
    for (const rawLabel of mergedSuggestionOptions) {
      const label = String(rawLabel || '').trim().toUpperCase();
      if (label === NOT_APPLICABLE_LABEL) continue;
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
      if (out.length >= maxRows) break;
    }
    return out.map((label, idx) => ({ key: `${label}-${idx}`, label }));
  }

  const scored = [];
  const seen = new Set();
  for (const rawLabel of mergedSuggestionOptions) {
    const label = String(rawLabel || '').trim().toUpperCase();
    if (!label || seen.has(label) || !label.includes(q)) continue;
    seen.add(label);
    scored.push({ label, pri: label.startsWith(q) ? 0 : 1 });
  }
  scored.sort((a, b) => a.pri - b.pri || a.label.localeCompare(b.label));
  return scored.slice(0, maxRows).map(({ label }, idx) => ({ key: `${label}-${idx}`, label }));
}

function FormTextCombo({
  value = '',
  onInputChange,
  suggestionOptions = [],
  placeholder,
  width = 'flex-1',
  className = '',
  ariaLabel,
  maxSuggestionRows = 40,
  includeNotApplicable = true,
  inputClassName = '',
}) {
  const listboxBaseId = useId();
  const listboxId = `${listboxBaseId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef(null);

  const suggestions = useMemo(
    () => getAutocompleteLabelSuggestions(value, suggestionOptions, maxSuggestionRows, includeNotApplicable),
    [value, suggestionOptions, maxSuggestionRows, includeNotApplicable],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const applyItem = useCallback(
    (item) => {
      if (!item) return;
      onInputChange(item.label);
      setOpen(false);
    },
    [onInputChange],
  );

  const showList = open && suggestions.length > 0;

  return (
    <div className={`relative min-w-0 ${width} ${className}`} ref={wrapRef}>
      <input
        type="text"
        value={value}
        aria-label={ariaLabel || placeholder || 'Text field'}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={showList ? `${listboxId}-opt-${activeIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          const nextValue = e.target.value.toUpperCase();
          onInputChange(nextValue);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length) setOpen(true);
          if (!showList) return;
          if (e.key === 'Escape') {
            setOpen(false);
            e.preventDefault();
          } else if (e.key === 'ArrowDown') {
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            e.preventDefault();
          } else if (e.key === 'ArrowUp') {
            setActiveIndex((i) => Math.max(i - 1, 0));
            e.preventDefault();
          } else if (e.key === 'Enter') {
            if (showList) {
              e.preventDefault();
              applyItem(suggestions[activeIndex]);
            }
          }
        }}
        placeholder={placeholder}
        className={`${inputClassName} min-h-[1.25rem] w-full border-b border-emerald-600 bg-transparent px-1 py-0.5 text-black`}
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px' }}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-[100] mt-0.5 max-h-56 min-w-full w-max max-w-[min(100vw-1rem,36rem)] overflow-auto rounded border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.key}
              id={`${listboxId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`cursor-pointer px-2 py-1.5 text-xs text-slate-800 sm:text-sm ${
                idx === activeIndex ? 'bg-emerald-200' : 'hover:bg-emerald-100'
              }`}
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(ev) => {
                ev.preventDefault();
                applyItem(item);
              }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormLine({
  value = '',
  onChange,
  placeholder,
  width = 'flex-1',
  className = '',
  suggestionOptions = [],
  includeNotApplicable = true,
  ariaLabel,
  inputClassName = '',
}) {
  return (
    <FormTextCombo
      value={value}
      onInputChange={onChange}
      suggestionOptions={suggestionOptions}
      placeholder={placeholder}
      width={width}
      className={className}
      includeNotApplicable={includeNotApplicable}
      ariaLabel={ariaLabel || placeholder || 'Text field'}
      inputClassName={inputClassName}
    />
  );
}

function MuslimAttachmentEmbedded({ onClose }) {
  const { id } = useParams();
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimerRef = useRef(null);
  const isFirstRender = useRef(true);
  const formRef = useRef(null);
  const [loadedData, setLoadedData] = useState(null);
  const [form, setForm] = useState({
    province: 'LANAO DEL NORTE',
    cityMunicipality: 'ILIGAN CITY',
    registryNo: '',
    childFirstName: '',
    childMiddleName: '',
    childLastName: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    hijrahDay: '',
    hijrahMonth: '',
    hijrahYear: '',
    fatherEthnicity: '',
    motherEthnicity: '',
    informantSignature: '',
    informantAddress: '',
    informantNameInPrint: '',
    informantRelationship: '',
    informantDate: '',
  });

  useEffect(() => {
    if (!id) return;
    childrenApi.get(id).then((data) => {
      const ma = data.muslim_attachment || {};
      const colb = data.certificate_of_live_birth || {};
      const childFirstName = ma.childFirstName || colb.childFirst || String(data.first_name ?? '').toUpperCase();
      const childMiddleName = ma.childMiddleName || colb.childMiddle || String(data.middle_name ?? '').toUpperCase();
      const childLastName = ma.childLastName || colb.childLast || String(data.last_name ?? '').toUpperCase();
      let birthDay = ma.birthDay || colb.birthDay || '';
      let birthMonth = ma.birthMonth || colb.birthMonth || '';
      let birthYear = ma.birthYear || colb.birthYear || '';
      if ((!birthDay && !birthMonth && !birthYear) && data.date_of_birth) {
        const parsed = parseDateOfBirth(data.date_of_birth);
        birthDay = parsed.day;
        birthMonth = parsed.month;
        birthYear = parsed.year;
      }
      const informantNameInPrint = ma.informantNameInPrint || colb.informantName || '';
      const informantAddress = ma.informantAddress || colb.informantAddress || '';
      const informantRelationship = ma.informantRelationship || colb.informantRelationship || '';
      const informantDate = ma.informantDate || colb.informantDate || '';
      setForm((f) => ({
        ...f,
        ...ma,
        childFirstName,
        childMiddleName,
        childLastName,
        birthDay,
        birthMonth,
        birthYear,
        informantNameInPrint,
        informantAddress,
        informantRelationship,
        informantDate,
        province: ma.province || 'LANAO DEL NORTE',
        cityMunicipality: ma.cityMunicipality || 'ILIGAN CITY',
      }));
      setLoadedData(data);
    }).catch(() => {});
  }, [id]);

  /* ── Auto-save: debounced save on every form change ── */
  useEffect(() => {
    if (isFirstRender.current || !id) {
      isFirstRender.current = false;
      return;
    }

    setAutoSaveStatus('saving');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await childrenApi.updateMuslimAttachment(id, form);
        setAutoSaveStatus('saved');
        toast.success('Muslim Attachment saved');
      } catch (err) {
        setAutoSaveStatus('error');
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [form, id]);

  /* ── Auto-save status clears after 3s on 'saved' ── */
  useEffect(() => {
    if (autoSaveStatus === 'saved') {
      const t = setTimeout(() => setAutoSaveStatus('idle'), 3000);
      return () => clearTimeout(t);
    }
  }, [autoSaveStatus]);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const childFirstNameSuggestions = useMemo(() => {
    if (!loadedData) return [];
    const colb = loadedData.certificate_of_live_birth || {};
    const s = new Set();
    const add = (v) => { const val = String(v ?? '').trim().toUpperCase(); if (val) s.add(val); };
    add(loadedData.first_name);
    add(colb.childFirst);
    return [...s];
  }, [loadedData]);

  const childMiddleNameSuggestions = useMemo(() => {
    if (!loadedData) return [];
    const colb = loadedData.certificate_of_live_birth || {};
    const s = new Set();
    const add = (v) => { const val = String(v ?? '').trim().toUpperCase(); if (val) s.add(val); };
    add(loadedData.middle_name);
    add(colb.childMiddle);
    return [...s];
  }, [loadedData]);

  const childLastNameSuggestions = useMemo(() => {
    if (!loadedData) return [];
    const colb = loadedData.certificate_of_live_birth || {};
    const s = new Set();
    const add = (v) => { const val = String(v ?? '').trim().toUpperCase(); if (val) s.add(val); };
    add(loadedData.last_name);
    add(colb.childLast);
    return [...s];
  }, [loadedData]);

  const dobSuggestions = useMemo(() => {
    if (!loadedData) return { day: [], month: [], year: [] };
    const colb = loadedData.certificate_of_live_birth || {};
    const day = new Set();
    const month = new Set();
    const year = new Set();
    const addDay = (v) => { const val = String(v ?? '').trim(); if (val) day.add(val); };
    const addMonth = (v) => { const val = String(v ?? '').trim(); if (val) month.add(val); };
    const addYear = (v) => { const val = String(v ?? '').trim(); if (val) year.add(val); };
    if (colb.birthDay) addDay(colb.birthDay);
    if (colb.birthMonth) addMonth(colb.birthMonth);
    if (colb.birthYear) addYear(colb.birthYear);
    if (loadedData.date_of_birth) {
      const parsed = parseDateOfBirth(loadedData.date_of_birth);
      if (parsed.day) addDay(parsed.day);
      if (parsed.month) addMonth(parsed.month);
      if (parsed.year) addYear(parsed.year);
    }
    return { day: [...day], month: [...month], year: [...year] };
  }, [loadedData]);

  const informantNameInPrintSuggestions = useMemo(() => {
    if (!loadedData) return [];
    const colb = loadedData.certificate_of_live_birth || {};
    const s = new Set();
    const add = (v) => { const val = String(v ?? '').trim().toUpperCase(); if (val) s.add(val); };
    add(colb.informantName);
    return [...s];
  }, [loadedData]);

  const informantAddressSuggestions = useMemo(() => {
    if (!loadedData) return [];
    const colb = loadedData.certificate_of_live_birth || {};
    const s = new Set();
    const add = (v) => { const val = String(v ?? '').trim().toUpperCase(); if (val) s.add(val); };
    add(colb.informantAddress);
    return [...s];
  }, [loadedData]);

  const informantRelationshipSuggestionOptions = useMemo(() => {
    const base = [...RELATIONSHIP_SUGGESTIONS];
    if (loadedData?.certificate_of_live_birth?.informantRelationship) {
      base.push(String(loadedData.certificate_of_live_birth.informantRelationship).toUpperCase());
    }
    return base;
  }, [loadedData]);

  const informantDateSuggestions = useMemo(() => {
    if (!loadedData) return [];
    const colb = loadedData.certificate_of_live_birth || {};
    const s = new Set();
    const add = (v) => { const val = String(v ?? '').trim().toUpperCase(); if (val) s.add(val); };
    add(colb.informantDate);
    return [...s];
  }, [loadedData]);

  /* ── Enter-to-next-field navigation ── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.defaultPrevented && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const container = formRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      ).filter((el) => el.tabIndex >= 0 && (el.offsetWidth > 0 || el.offsetHeight > 0));
      const index = focusable.indexOf(e.target);
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      }
    }
  };

  const autoSaveLabel = {
    idle: '',
    saving: 'Auto-saving…',
    saved: 'All changes saved',
    error: 'Save failed',
  }[autoSaveStatus];

  const autoSaveColor = {
    idle: 'text-slate-400',
    saving: 'text-amber-500',
    saved: 'text-emerald-600',
    error: 'text-red-500',
  }[autoSaveStatus];

  return (
    <div ref={formRef} onKeyDown={handleKeyDown} className="bg-white rounded-xl shadow-lg border border-emerald-200 relative">
      <div className="sticky top-0 z-10 rounded-t-xl border-b border-emerald-100 bg-emerald-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-emerald-800">✎️ Edit Muslim Attachment</span>
          {autoSaveLabel && (
            <span className={`text-xs font-medium ${autoSaveColor}`}>
              {autoSaveLabel}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
      <div className="muslim-edit-form-sheet">

        <div className="edit-form-grid">
          <div className="edit-fr-title-row">
            <div>
              <span className="edit-label">Municipal Form No. 102</span>
              <div className="edit-form-sub">(Revised January 2007, attachment)</div>
            </div>
            <div className="edit-fr-instruction">(To be accomplished in quadruplicate using black ink)</div>
          </div>

          <div className="edit-fr-location-row">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 flex-1 items-baseline">
              <span className="edit-field-label">Province</span>
              <FormLine value={form.province} onChange={v => updateField('province', v)} inputClassName="edit-field-line" />
              <span className="edit-field-label">City/Municipality</span>
              <FormLine value={form.cityMunicipality} onChange={v => updateField('cityMunicipality', v)} inputClassName="edit-field-line" />
            </div>
          </div>

          <div className="edit-fr-section">
            <div className="edit-fr-section-label mb-2">1. NAME OF CHILD</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-emerald-700 mb-1">(First)</span>
                <FormLine value={form.childFirstName} onChange={v => updateField('childFirstName', v)} suggestionOptions={childFirstNameSuggestions} includeNotApplicable={false} inputClassName="edit-field-line text-center" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-emerald-700 mb-1">(Middle)</span>
                <FormLine value={form.childMiddleName} onChange={v => updateField('childMiddleName', v)} suggestionOptions={childMiddleNameSuggestions} includeNotApplicable={false} inputClassName="edit-field-line text-center" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-emerald-700 mb-1">(Last)</span>
                <FormLine value={form.childLastName} onChange={v => updateField('childLastName', v)} suggestionOptions={childLastNameSuggestions} includeNotApplicable={false} inputClassName="edit-field-line text-center" />
              </div>
            </div>
          </div>

          <div className="edit-fr-section">
            <div className="edit-fr-section-label mb-1">2. DATE OF BIRTH</div>
            <div className="flex gap-2 mb-1 pl-[150px]">
              <span className="text-[11px] text-emerald-700 text-center" style={{ width: '20%' }}>(Day)</span>
              <span className="text-[11px] text-emerald-700 text-center" style={{ width: '50%' }}>(Month)</span>
              <span className="text-[11px] text-emerald-700 text-center" style={{ width: '30%' }}>(Year)</span>
            </div>
            <div className="flex gap-2 items-center mb-1">
              <span className="text-xs text-emerald-700 font-medium w-[150px] shrink-0">Gregorian Calendar</span>
              <div className="flex flex-1 border-b border-emerald-400">
                <FormTextCombo value={form.birthDay} onInputChange={v => updateField('birthDay', v)} suggestionOptions={dobSuggestions.day} includeNotApplicable={false} width="w-[20%]" inputClassName="edit-field-line text-center border-b-0 min-h-[1.2em]" />
                <FormTextCombo value={form.birthMonth} onInputChange={v => updateField('birthMonth', v)} suggestionOptions={dobSuggestions.month} includeNotApplicable={false} width="w-[50%]" inputClassName="edit-field-line text-center border-b-0 min-h-[1.2em]" />
                <FormTextCombo value={form.birthYear} onInputChange={v => updateField('birthYear', v)} suggestionOptions={dobSuggestions.year} includeNotApplicable={false} width="w-[30%]" inputClassName="edit-field-line text-center border-b-0 min-h-[1.2em]" />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-emerald-700 font-medium w-[150px] shrink-0">Hijrah Calendar</span>
              <div className="flex flex-1 border-b border-emerald-400">
                <FormTextCombo value={form.hijrahDay} onInputChange={v => updateField('hijrahDay', v)} width="w-[20%]" inputClassName="edit-field-line text-center border-b-0 min-h-[1.2em]" />
                <FormTextCombo value={form.hijrahMonth} onInputChange={v => updateField('hijrahMonth', v)} width="w-[50%]" inputClassName="edit-field-line text-center border-b-0 min-h-[1.2em]" />
                <FormTextCombo value={form.hijrahYear} onInputChange={v => updateField('hijrahYear', v)} width="w-[30%]" inputClassName="edit-field-line text-center border-b-0 min-h-[1.2em]" />
              </div>
            </div>
          </div>

          <div className="edit-fr-section">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <div className="edit-label text-xs mb-1">3. ETHNICITY OF THE FATHER</div>
                <FormTextCombo value={form.fatherEthnicity} onInputChange={v => updateField('fatherEthnicity', v)} suggestionOptions={ETHNICITY_SUGGESTIONS} width="w-full" inputClassName="edit-field-line text-center" />
              </div>
              <div className="flex flex-col items-center">
                <div className="edit-label text-xs mb-1">4. ETHNICITY OF THE MOTHER</div>
                <FormTextCombo value={form.motherEthnicity} onInputChange={v => updateField('motherEthnicity', v)} suggestionOptions={ETHNICITY_SUGGESTIONS} width="w-full" inputClassName="edit-field-line text-center" />
              </div>
            </div>
          </div>

          <div className="edit-fr-section edit-fr-section-last">
            <div className="edit-label mb-2">5. INFORMANT</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-2">
                <span className="edit-field-label w-[100px]">Signature</span>
                <FormLine value={form.informantSignature} onChange={v => updateField('informantSignature', v)} inputClassName="edit-field-line" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="edit-field-label w-[100px]">Address</span>
                <FormLine value={form.informantAddress} onChange={v => updateField('informantAddress', v)} suggestionOptions={informantAddressSuggestions} includeNotApplicable={false} inputClassName="edit-field-line" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="edit-field-label w-[100px]">Name in Print</span>
                <FormLine value={form.informantNameInPrint} onChange={v => updateField('informantNameInPrint', v)} suggestionOptions={informantNameInPrintSuggestions} includeNotApplicable={false} inputClassName="edit-field-line" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="invisible w-[100px] text-xs">Address</span>
                <span className="edit-field-line flex-1 min-h-[24px]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="edit-field-label w-[100px]">Relationship</span>
                <FormTextCombo value={form.informantRelationship} onInputChange={v => updateField('informantRelationship', v)} suggestionOptions={informantRelationshipSuggestionOptions} inputClassName="edit-field-line" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="edit-field-label w-[100px]">Date</span>
                <FormLine value={form.informantDate} onChange={v => updateField('informantDate', v)} suggestionOptions={informantDateSuggestions} includeNotApplicable={false} inputClassName="edit-field-line" />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <style>{`
        /* ─── Muslim Attachment Embedded Form Styles ─── */

        .muslim-edit-form-sheet {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          background: #fff;
          max-width: 850px;
          margin: 0 auto;
        }

        .muslim-edit-form-sheet .edit-header {
          text-align: center;
          margin-bottom: 8px;
        }

        .muslim-edit-form-sheet .edit-header-logo img {
          height: 70px;
          width: auto;
        }

        .muslim-edit-form-sheet .edit-form-grid {
          border: 1.5px solid #10b981;
          border-radius: 6px;
          overflow: hidden;
        }

        .muslim-edit-form-sheet .edit-fr-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px 14px;
          border-bottom: 1px solid #10b981;
          background: #f0fdf4;
        }

        .muslim-edit-form-sheet .edit-form-sub {
          font-size: 11px;
          margin-top: 2px;
          color: #065f46;
        }

        .muslim-edit-form-sheet .edit-fr-instruction {
          text-align: right;
          font-size: 11px;
          color: #065f46;
          max-width: 200px;
        }

        .muslim-edit-form-sheet .edit-fr-location-row {
          display: flex;
          gap: 24px;
          padding: 10px 14px;
          border-bottom: 1px solid #10b981;
        }

        .muslim-edit-form-sheet .edit-fr-section {
          padding: 10px 14px;
          border-bottom: 1px solid #10b981;
        }

        .muslim-edit-form-sheet .edit-fr-section-last {
          border-bottom: none;
        }

        .muslim-edit-form-sheet .edit-fr-section-label {
          font-weight: 700;
          font-size: 13px;
          color: #065f46;
          letter-spacing: 0.3px;
        }

        .muslim-edit-form-sheet .edit-label {
          font-weight: 700;
          color: #065f46;
          letter-spacing: 0.3px;
        }

        .muslim-edit-form-sheet .edit-field-label {
          white-space: nowrap;
          font-size: 12.5px;
          color: #065f46;
        }

        .muslim-edit-form-sheet .edit-field-line {
          display: block;
          width: 100%;
          border: none;
          border-bottom: 1px solid #10b981;
          background: transparent;
          font-size: 13px;
          font-family: Arial, Helvetica, sans-serif;
          padding: 3px 4px;
          outline: none;
          color: #000;
          transition: border-color 0.15s;
        }

        .muslim-edit-form-sheet .edit-field-line:focus {
          border-bottom-color: #047857;
          border-bottom-width: 2px;
        }

        .muslim-edit-form-sheet input.edit-field-line.border-b-0 {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}