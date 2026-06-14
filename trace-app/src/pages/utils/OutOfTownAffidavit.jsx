import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';
import {
  getOutOfTownVariantForChild,
  buildOutOfTownAffidavitPrintPath,
  OUT_OF_TOWN_APPLICANT_VARIANT,
  OUT_OF_TOWN_VARIANT_LABEL,
} from '../../utils/outOfTownVariant';

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const NOT_APPLICABLE_LABEL = 'NOT APPLICABLE';

function trimStr(v) {
  if (v == null) return '';
  return String(v).trim();
}

function joinNameParts(parts) {
  return parts.map((p) => trimStr(p).toUpperCase()).filter(Boolean).join(' ');
}

function formatLongUpperDate(yi, mi, di) {
  if (!Number.isInteger(yi) || !Number.isInteger(mi) || !Number.isInteger(di)) return '';
  if (yi < 1000 || yi > 9999 || mi < 1 || mi > 12 || di < 1 || di > 31) return '';
  const date = new Date(Date.UTC(yi, mi - 1, di));
  if (date.getUTCFullYear() !== yi || date.getUTCMonth() !== mi - 1 || date.getUTCDate() !== di) return '';
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase();
  return `${month} ${di}, ${yi}`;
}

function toUpperLongDate(rawDate) {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (/^[A-Z]+\s+\d{1,2},\s+\d{4}$/.test(trimmed)) return trimmed;
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    return formatLongUpperDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';
  return formatLongUpperDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
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
          onInputChange(e.target.value.toUpperCase());
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
          } else if (e.key === 'Enter' && showList) {
            e.preventDefault();
            applyItem(suggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        className="focus:outline-none focus:ring-0 min-h-[1.25rem] w-full border-b border-green-600 bg-transparent px-1 py-0.5 text-black"
        style={{ fontFamily: FONT_FAMILY, fontSize: '15px' }}
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
              style={{ fontFamily: FONT_FAMILY }}
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

function FormLine(props) {
  return <FormTextCombo {...props} onInputChange={props.onChange} />;
}

const EMPTY_FORM = {
  registryNo: '',
  affiantName: '',
  affiantResidence: 'ILIGAN CITY',
  birthDate: '',
  birthPlace: '',
  fatherName: '',
  motherName: '',
  lcroOffice: '',
  relationshipToApplicant: '',
  applicantName: '',
  corroborator1Name: '',
  corroborator2Name: '',
  corroboratorResidence: 'ILIGAN CITY',
  corroboratorDay: '',
  corroboratorMonth: '',
  affixedDay: '',
  affixedMonth: '',
  affiantSignature: '',
  corroborator1Signature: '',
  corroborator2Signature: '',
  swornDay: '',
  swornMonth: '',
};

export function OutOfTownAffidavit({ embedded = false, onClose }) {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const formRef = useRef(null);

  const variant = useMemo(() => getOutOfTownVariantForChild(child), [child]);
  const isApplicantVariant = variant === OUT_OF_TOWN_APPLICANT_VARIANT;

  useEffect(() => {
    if (!id) return;
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const cert =
          data.certificate_of_live_birth && typeof data.certificate_of_live_birth === 'object'
            ? data.certificate_of_live_birth
            : null;
        setCertificate(cert);
        const stored = data.out_of_town_affidavit || {};
        setForm((prev) => {
          const merged = { ...prev, ...stored };
          const birthDate = toUpperLongDate(merged.birthDate) || merged.birthDate;
          return { ...merged, birthDate };
        });
      })
      .catch(() => toast.error('Failed to load applicant data'))
      .finally(() => setLoading(false));
  }, [id]);

  const dropdownOptions = useMemo(() => {
    const cert = certificate || {};
    const childFromCert = joinNameParts([cert.childFirst, cert.childMiddle, cert.childLast]);
    const childFromRecord = joinNameParts([child?.first_name, child?.middle_name, child?.last_name]);
    const applicantName = childFromCert || childFromRecord;
    const fatherFromCert = joinNameParts([cert.fatherFirst, cert.fatherMiddle, cert.fatherLast]);
    const motherFromCert = joinNameParts([cert.motherFirst, cert.motherMiddle, cert.motherLast]);
    const informantName = trimStr(cert.informantName).toUpperCase();

    const dobFromCert = (() => {
      const y = trimStr(cert.birthYear);
      const m = trimStr(cert.birthMonth);
      const d = trimStr(cert.birthDay);
      if (!y || !m || !d) return '';
      return formatLongUpperDate(Number(y), Number(m), Number(d));
    })();
    const dobFromRecord = toUpperLongDate(child?.date_of_birth);

    const pobFromCert = (() => {
      const city = trimStr(cert.placeOfBirthCity).toUpperCase();
      const province = trimStr(cert.placeOfBirthProvince).toUpperCase();
      if (!city && !province) return '';
      if (city && province) return `${city}, ${province}`;
      return city || province;
    })();
    const pobFromRecord = trimStr(child?.place_of_birth).toUpperCase();
    const childPlaceOfBirthCity = trimStr(cert.placeOfBirthCity).toUpperCase();

    return {
      affiantName: [informantName, isApplicantVariant ? applicantName : ''].filter(Boolean),
      applicantName: [applicantName].filter(Boolean),
      birthDate: [dobFromCert, dobFromRecord].filter(Boolean),
      birthPlace: [pobFromCert, pobFromRecord].filter(Boolean),
      fatherName: [fatherFromCert].filter(Boolean),
      motherName: [motherFromCert].filter(Boolean),
      lcroOffice: [childPlaceOfBirthCity].filter(Boolean),
      affiantResidence: ['ILIGAN CITY', 'ILIGAN CITY, LANAO DEL NORTE'].filter(Boolean),
      corroboratorResidence: ['ILIGAN CITY', 'ILIGAN CITY, LANAO DEL NORTE'].filter(Boolean),
    };
  }, [certificate, child, isApplicantVariant]);

  const dateNowSuggestions = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    const getOrdinal = (d) => {
      const j = d % 10;
      const k = d % 100;
      if (j === 1 && k !== 11) return `${d}ST`;
      if (j === 2 && k !== 12) return `${d}ND`;
      if (j === 3 && k !== 13) return `${d}RD`;
      return `${d}TH`;
    };
    const monthStr = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    return {
      day: [String(day), getOrdinal(day)],
      month: [monthStr],
    };
  }, []);

  useEffect(() => {
    if (loading || !id) return;
    const timeout = setTimeout(() => {
      childrenApi
        .updateOutOfTownAffidavit(id, form)
        .then(() => toast.success('Saved', { id: 'out-of-town-save' }))
        .catch(() => {});
    }, 1000);
    return () => clearTimeout(timeout);
  }, [form, id, loading]);

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.defaultPrevented && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      const container = formRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])'),
      ).filter((el) => el.tabIndex >= 0 && (el.offsetWidth > 0 || el.offsetHeight > 0));
      const index = focusable.indexOf(e.target);
      if (index > -1 && index < focusable.length - 1) {
        e.preventDefault();
        focusable[index + 1].focus();
      }
    }
  }, []);

  const printPath = buildOutOfTownAffidavitPrintPath(basePath, id);
  const title = OUT_OF_TOWN_VARIANT_LABEL[variant] || 'Out-of-Town Affidavit';
  const corroborationSubjectSuggestions = isApplicantVariant
    ? [form.affiantName, ...(dropdownOptions.affiantName || [])].filter(Boolean)
    : [form.applicantName, ...(dropdownOptions.applicantName || [])].filter(Boolean);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const formBlock = (
    <form
      ref={formRef}
      onKeyDown={handleKeyDown}
      onSubmit={(e) => e.preventDefault()}
      className="relative overflow-hidden border-[12px] border-emerald-600 bg-white p-8 shadow-lg"
      style={{ fontFamily: FONT_FAMILY, minHeight: '11in' }}
    >
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">AFFIDAVIT FOR DELAYED REGISTRATION OF BIRTH WITH CORROBORATION</h1>
        <p className="mt-1 text-xs italic text-slate-600">{title}</p>
      </div>

     

      <div className="space-y-5 text-base leading-relaxed">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>I,</span>
          <FormTextCombo
            value={form.affiantName}
            onInputChange={(v) => update('affiantName', v)}
            suggestionOptions={dropdownOptions.affiantName}
            placeholder="(Affiant name)"
            width="w-64"
            ariaLabel="Affiant name"
          />
          <span>, of legal age, Filipino, and a resident of</span>
          <FormTextCombo
            value={form.affiantResidence}
            onInputChange={(v) => update('affiantResidence', v)}
            suggestionOptions={dropdownOptions.affiantResidence}
            placeholder="(Residence)"
            width="flex-1 min-w-[12rem]"
            ariaLabel="Affiant residence"
          />
          <span>, Philippines, after having been duly sworn to in accordance with law depose and say:</span>
        </div>

        {isApplicantVariant ? (
          <p>That I am an applicant for the late registration of my birth;</p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <span>That I am the</span>
            <FormTextCombo
              value={form.relationshipToApplicant}
              onInputChange={(v) => update('relationshipToApplicant', v)}
              placeholder="(Relationship)"
              width="w-40"
              ariaLabel="Relationship to applicant"
            />
            <span>of</span>
            <FormTextCombo
              value={form.applicantName}
              onInputChange={(v) => update('applicantName', v)}
              suggestionOptions={dropdownOptions.applicantName}
              placeholder="(Applicant name)"
              width="w-64"
              ariaLabel="Applicant name"
            />
            <span>who is an applicant for late registration of birth;</span>
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-2">
          <span>{isApplicantVariant ? 'That I was born on' : 'That he/she was born on'}</span>
          <FormTextCombo
            value={toUpperLongDate(form.birthDate) || form.birthDate}
            onInputChange={(v) => update('birthDate', toUpperLongDate(v) || v)}
            suggestionOptions={dropdownOptions.birthDate}
            placeholder="(Date of birth)"
            width="w-48"
            ariaLabel="Date of birth"
          />
          <span>at</span>
          <FormTextCombo
            value={form.birthPlace}
            onInputChange={(v) => update('birthPlace', v)}
            suggestionOptions={dropdownOptions.birthPlace}
            placeholder="(Place of birth)"
            width="flex-1 min-w-[12rem]"
            ariaLabel="Place of birth"
          />
          <span>;</span>
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          <span>{isApplicantVariant ? 'That my parents are' : 'That his/her parents are'}</span>
          <FormTextCombo
            value={form.fatherName}
            onInputChange={(v) => update('fatherName', v)}
            suggestionOptions={dropdownOptions.fatherName}
            placeholder="(Father's name)"
            width="w-56"
            ariaLabel="Father name"
          />
          <span>and</span>
          <FormTextCombo
            value={form.motherName}
            onInputChange={(v) => update('motherName', v)}
            suggestionOptions={dropdownOptions.motherName}
            placeholder="(Mother's name)"
            width="w-56"
            ariaLabel="Mother name"
          />
          <span>;</span>
        </div>

        <p>
          That the facts of {isApplicantVariant ? 'my' : 'his/her'} birth were not duly registered with the Local Civil
          Registry Office of{' '}
          <FormTextCombo
            value={form.lcroOffice}
            onInputChange={(v) => update('lcroOffice', v)}
            suggestionOptions={dropdownOptions.lcroOffice}
            placeholder="(LCRO office)"
            width="w-48"
            className="inline-flex align-baseline"
            ariaLabel="LCRO office"
          />{' '}
          within the period required by law due to inadvertence of my parents and not knowing the adverse consequence it
          may bring about;
        </p>

        <p>
          That I execute this affidavit to attest to the truth of the foregoing statements and for any lawful purpose
          which it may serve.
        </p>

        <div className="flex flex-wrap items-baseline gap-2 mt-8">
          <span className="font-bold">IN WITNESS WHEREOF,</span>
          <span>I have hereunto set my hand this</span>
          <FormLine
            value={form.affixedDay}
            onChange={(v) => update('affixedDay', v)}
            placeholder="(Day)"
            width="w-16"
            suggestionOptions={dateNowSuggestions.day}
          />
          <span>day of</span>
          <FormLine
            value={form.affixedMonth}
            onChange={(v) => update('affixedMonth', v)}
            placeholder="(Month)"
            width="w-36"
            suggestionOptions={dateNowSuggestions.month}
          />
          <span>at Iligan City, Philippines.</span>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-72 text-center">
            <FormTextCombo
              value={form.affiantSignature}
              onInputChange={(v) => update('affiantSignature', v)}
              suggestionOptions={form.affiantName ? [form.affiantName] : []}
              placeholder="(Affiant)"
              width="w-full"
              className="text-center font-bold uppercase"
              ariaLabel="Affiant signature"
            />
            <p className="mt-1 text-xs">Affiant</p>
          </div>
        </div>

        <h2 className="mt-8 text-center text-base font-bold tracking-tight">CORROBORATION</h2>

        <div className="flex flex-wrap items-baseline gap-2">
          <span>We,</span>
          <FormTextCombo
            value={form.corroborator1Name}
            onInputChange={(v) => update('corroborator1Name', v)}
            placeholder="(First corroborator)"
            width="w-56"
            ariaLabel="First corroborator name"
          />
          <span>and</span>
          <FormTextCombo
            value={form.corroborator2Name}
            onInputChange={(v) => update('corroborator2Name', v)}
            placeholder="(Second corroborator)"
            width="w-56"
            ariaLabel="Second corroborator name"
          />
          <span>, both of legal age, Filipinos, and residents of</span>
          <FormTextCombo
            value={form.corroboratorResidence}
            onInputChange={(v) => update('corroboratorResidence', v)}
            suggestionOptions={dropdownOptions.corroboratorResidence}
            placeholder="(Residence)"
            width="flex-1 min-w-[12rem]"
            ariaLabel="Corroborators residence"
          />
          <span>, Philippines, after having been duly sworn to in accordance with law depose and say:</span>
        </div>

        <p>
          That we personally declare that the above-statements of{' '}
          <FormTextCombo
            value={isApplicantVariant ? form.affiantName : form.applicantName}
            onInputChange={(v) =>
              isApplicantVariant ? update('affiantName', v) : update('applicantName', v)
            }
            suggestionOptions={corroborationSubjectSuggestions}
            placeholder="(Subject name)"
            width="w-64"
            className="inline-flex align-baseline"
            ariaLabel="Corroboration subject name"
          />{' '}
          are true and correct to the best of our knowledge and beliefs having known him/her.
        </p>

        <div className="flex flex-wrap items-baseline gap-2 mt-8">
          <span className="font-bold">IN WITNESS WHEREOF,</span>
          <span>we have hereunto set our hands this</span>
          <FormLine
            value={form.corroboratorDay}
            onChange={(v) => update('corroboratorDay', v)}
            placeholder="(Day)"
            width="w-16"
            suggestionOptions={dateNowSuggestions.day}
          />
          <span>day of</span>
          <FormLine
            value={form.corroboratorMonth}
            onChange={(v) => update('corroboratorMonth', v)}
            placeholder="(Month)"
            width="w-36"
            suggestionOptions={dateNowSuggestions.month}
          />
          <span>at Iligan City, Philippines.</span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-12">
          <div className="text-center">
            <FormTextCombo
              value={form.corroborator1Signature}
              onInputChange={(v) => update('corroborator1Signature', v)}
              suggestionOptions={form.corroborator1Name ? [form.corroborator1Name] : []}
              placeholder="(First affiant)"
              width="w-full"
              className="text-center font-bold uppercase"
              ariaLabel="First corroborator signature"
            />
            <p className="mt-1 text-xs">Affiant</p>
          </div>
          <div className="text-center">
            <FormTextCombo
              value={form.corroborator2Signature}
              onInputChange={(v) => update('corroborator2Signature', v)}
              suggestionOptions={form.corroborator2Name ? [form.corroborator2Name] : []}
              placeholder="(Second affiant)"
              width="w-full"
              className="text-center font-bold uppercase"
              ariaLabel="Second corroborator signature"
            />
            <p className="mt-1 text-xs">Affiant</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-baseline gap-2">
          <span className="font-bold">SUBSCRIBED AND SWORN</span>
          <span>to before me this</span>
          <FormLine
            value={form.swornDay}
            onChange={(v) => update('swornDay', v)}
            placeholder="(Day)"
            width="w-16"
            suggestionOptions={dateNowSuggestions.day}
          />
          <span>day of</span>
          <FormLine
            value={form.swornMonth}
            onChange={(v) => update('swornMonth', v)}
            placeholder="(Month)"
            width="w-36"
            suggestionOptions={dateNowSuggestions.month}
          />
          <span>in the ILIGAN CITY, Philippines.</span>
        </div>
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className="print:hidden">
        {formBlock}
        {onClose ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View document
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-slate-50 p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600">
          ← Back to applicant
        </Link>
        <Link
          to={printPath}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
        >
          Print / PDF
        </Link>
      </div>
      {formBlock}
    </div>
  );
}
