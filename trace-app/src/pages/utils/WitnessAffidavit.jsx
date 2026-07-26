import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';
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

export function WitnessAffidavit({ embedded = false, onClose }) {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [loading, setLoading] = useState(true);
  const formRef = useRef(null);
  const [child, setChild] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [form, setForm] = useState({
    registryNo: '',
    witness1Name: '',
    witness2Name: '',
    residence: '',
    childName: '',
    childDob: '',
    childPob: '',
    fatherName: '',
    motherName: '',
    civilRegistrarOffice: '',
    lateRegistrationName: '',
    affixedDay: '',
    affixedMonth: '',
    witness1Signature: '',
    witness2Signature: '',
    swornDay: '',
    swornMonth: '',
  });

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
        const stored = data.witness_affidavit || {};
        setForm((prev) => {
          const merged = { ...prev, ...stored };
          const childDob = toUpperLongDate(merged.childDob) || merged.childDob;
          return { ...merged, childDob };
        });
      })
      .catch(() => toast.error('Failed to load child data'))
      .finally(() => setLoading(false));
  }, [id]);

  const dropdownOptions = useMemo(() => {
    const cert = certificate || {};
    const fatherFromCert = joinNameParts([cert.fatherFirst, cert.fatherMiddle, cert.fatherLast]);
    const motherFromCert = joinNameParts([cert.motherFirst, cert.motherMiddle, cert.motherLast]);
    const childFromCert = joinNameParts([cert.childFirst, cert.childMiddle, cert.childLast]);
    const childFromRecord = joinNameParts([child?.first_name, child?.middle_name, child?.last_name]);
    const childName = childFromCert || childFromRecord;

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

    return {
      childName: [childName].filter(Boolean),
      childDob: [dobFromCert, dobFromRecord].filter(Boolean),
      childPob: [pobFromCert, pobFromRecord].filter(Boolean),
      fatherName: [fatherFromCert].filter(Boolean),
      motherName: [motherFromCert].filter(Boolean),
      lateRegistrationName: [childName].filter(Boolean),
      civilRegistrarOffice: (() => {
        const city = trimStr(cert?.placeOfBirthCity).toUpperCase();
        if (city) return [city];
        const pob = String(child?.place_of_birth || '').trim().toUpperCase();
        return pob ? [pob] : [];
      })(),
      residence: ['ILIGAN CITY, LANAO DEL NORTE'].filter(Boolean),
    };
  }, [certificate, child]);

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
        .updateWitnessAffidavit(id, form)
        .then(() => toast.success('Saved', { id: 'witness-save' }))
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

  const printPath = `${basePath}/${id}/witness-affidavit/print`;

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const formBlock = (
      <form
        ref={formRef}
        onKeyDown={handleKeyDown}
        onSubmit={(e) => e.preventDefault()}
        className="bg-white p-8 shadow-lg border-[12px] border-emerald-600 relative overflow-hidden"
        style={{ fontFamily: FONT_FAMILY, minHeight: '11in' }}
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight">AFFIDAVIT TWO DISINTERESTED WITNESSES</h1>
          <p className="text-xs italic mt-1">(For Late registration of Birth)</p>
        </div>

        <div className="space-y-5 text-base leading-relaxed">
          <div className="flex flex-wrap items-baseline gap-2">
            <span>We,</span>
            <FormTextCombo
              value={form.witness1Name}
              onInputChange={(v) => update('witness1Name', v)}
              placeholder="(First witness)"
              width="w-56"
              ariaLabel="First witness name"
            />
            <span>and</span>
            <FormTextCombo
              value={form.witness2Name}
              onInputChange={(v) => update('witness2Name', v)}
              placeholder="(Second witness)"
              width="w-56"
              ariaLabel="Second witness name"
            />
            <span>, both of legal age, Filipinos, and residents of</span>
            <FormTextCombo
              value={form.residence}
              onInputChange={(v) => update('residence', v)}
              suggestionOptions={dropdownOptions.residence}
              placeholder="(Residence)"
              width="flex-1 min-w-[12rem]"
              ariaLabel="Witness residence"
            />
            <span>, Philippines, after having been duly sworn to in accordance with law depose and say:</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>That we personally know</span>
            <FormTextCombo
              value={form.childName}
              onInputChange={(v) => update('childName', v)}
              suggestionOptions={dropdownOptions.childName}
              placeholder="(Child's name)"
              width="w-72"
              ariaLabel="Child name"
            />
            <span>born on</span>
            <FormTextCombo
              value={toUpperLongDate(form.childDob) || form.childDob}
              onInputChange={(v) => update('childDob', toUpperLongDate(v) || v)}
              suggestionOptions={dropdownOptions.childDob}
              placeholder="(Date of birth)"
              width="w-48"
              ariaLabel="Child date of birth"
            />
            <span>at</span>
            <FormTextCombo
              value={form.childPob}
              onInputChange={(v) => update('childPob', v)}
              suggestionOptions={dropdownOptions.childPob}
              placeholder="(Place of birth)"
              width="flex-1 min-w-[12rem]"
              ariaLabel="Child place of birth"
            />
            <span>to parents</span>
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
            <span>.</span>
          </div>

          <p>
            That the fact of birth of{' '}
            <FormTextCombo
              value={form.lateRegistrationName}
              onInputChange={(v) => update('lateRegistrationName', v)}
              suggestionOptions={dropdownOptions.lateRegistrationName}
              placeholder="(Child's name)"
              width="w-72"
              className="inline-flex align-baseline"
              ariaLabel="Child name for late registration"
            />{' '}
            was not promptly recorded at the Civil Registrar&apos;s Office of{' '}
            <FormTextCombo
              value={form.civilRegistrarOffice}
              onInputChange={(v) => update('civilRegistrarOffice', v)}
              suggestionOptions={dropdownOptions.civilRegistrarOffice}
              placeholder="(Civil registrar office)"
              width="w-48"
              className="inline-flex align-baseline"
              ariaLabel="Civil registrar office"
            />
            , as a result, no records appeared in the Philippine Statistics Authority (PSA);
          </p>

          <p>That we have knowledge of the foregoing facts because we are close friends of their family;</p>

          <p>
            That we are executing this affidavit to attest to the veracity and truthfulness of the foregoing statements
            and for the purpose of late registration of birth of{' '}
            <FormTextCombo
              value={form.lateRegistrationName}
              onInputChange={(v) => update('lateRegistrationName', v)}
              suggestionOptions={dropdownOptions.lateRegistrationName}
              placeholder="(Child's name)"
              width="w-72"
              className="inline-flex align-baseline"
              ariaLabel="Late registration child name"
            />
            .
          </p>

          <div className="flex flex-wrap items-baseline gap-2 mt-8">
            <span className="font-bold">IN WITNESS WHEREOF,</span>
            <span>we have hereunto set our hands this</span>
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

          <div className="grid grid-cols-2 gap-12 mt-10">
            <div className="text-center">
              <FormTextCombo
                value={form.witness1Signature}
                onInputChange={(v) => update('witness1Signature', v)}
                suggestionOptions={form.witness1Name ? [form.witness1Name] : []}
                placeholder="(First affiant)"
                width="w-full"
                className="text-center font-bold uppercase"
                ariaLabel="First affiant signature"
              />
              <p className="text-xs mt-1">Affiant</p>
            </div>
            <div className="text-center">
              <FormTextCombo
                value={form.witness2Signature}
                onInputChange={(v) => update('witness2Signature', v)}
                suggestionOptions={form.witness2Name ? [form.witness2Name] : []}
                placeholder="(Second affiant)"
                width="w-full"
                className="text-center font-bold uppercase"
                ariaLabel="Second affiant signature"
              />
              <p className="text-xs mt-1">Affiant</p>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 mt-10">
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
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8 bg-slate-50 min-h-screen">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600">
          ← Back to Applicant
        </Link>
        <Link
          to={printPath}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 text-center"
        >
          Preview / Print / Save PDF
        </Link>
      </div>

      {formBlock}

      <div className="mt-5 mb-6 flex items-center justify-between print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600">
          ← Back to Applicant
        </Link>
      </div>
    </div>
  );
}

