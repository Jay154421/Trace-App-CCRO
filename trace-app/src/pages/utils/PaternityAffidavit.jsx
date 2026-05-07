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
  const out = parts
    .map((p) => trimStr(p).toUpperCase())
    .filter(Boolean);
  return out.join(' ');
}

function formatLongUpperDate(yi, mi, di) {
  if (!Number.isInteger(yi) || !Number.isInteger(mi) || !Number.isInteger(di)) return '';
  if (yi < 1000 || yi > 9999 || mi < 1 || mi > 12 || di < 1 || di > 31) return '';

  const date = new Date(Date.UTC(yi, mi - 1, di));
  if (
    date.getUTCFullYear() !== yi ||
    date.getUTCMonth() !== mi - 1 ||
    date.getUTCDate() !== di
  ) {
    return '';
  }

  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase();
  return `${month} ${di}, ${yi}`;
}

function getAutocompleteLabelSuggestions(query, suggestionOptions, maxRows = 40, includeNotApplicable = true) {
  const q = String(query || '').trim().toUpperCase();
  const base = Array.isArray(suggestionOptions) ? suggestionOptions : [];
  const mergedSuggestionOptions = includeNotApplicable ? [...base, NOT_APPLICABLE_LABEL] : base;
  if (!q) {
    const seen = new Set();
    const out = [];
    // On empty query, do NOT show "NOT APPLICABLE" unless the user types it.
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
  return scored.slice(0, maxRows).map(({ label }, idx) => ({
    key: `${label}-${idx}`,
    label,
  }));
}

/**
 * City-dropdown style: input + suggestion listbox (same interaction pattern as CertificateOfLiveBirth).
 * Note: suggestion values are displayed uppercase.
 */
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

function FormLine({ value = '', onChange, placeholder, width = 'flex-1', className = '' }) {
  return (
    <FormTextCombo
      value={value}
      onInputChange={onChange}
      suggestionOptions={[]}
      placeholder={placeholder}
      width={width}
      className={className}
      includeNotApplicable
      maxSuggestionRows={1}
      ariaLabel={placeholder || 'Text field'}
    />
  );
}

export function PaternityAffidavit() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [form, setForm] = useState({
    motherName: '',
    fatherName: '',
    childName: '',
    dob: '',
    pob: '',
    fatherSignatureName: '',
    motherSignatureName: '',
    swornDay: '',
    swornMonth: '',
    swornYear: '',
    swornBy1: '',
    swornBy2: '',
    ctcNo: '',
    issuedOn: '',
    issuedAt: '',
    administeringOfficer: '',
    position: '',
    nameInPrint: '',
    address: '',
  });

  useEffect(() => {
    if (!id) return;
    childrenApi.get(id)
      .then(data => {
        const stored = data.paternity_affidavit || {};
        const cert = data.certificate_of_live_birth && typeof data.certificate_of_live_birth === 'object'
          ? data.certificate_of_live_birth
          : null;
        setCertificate(cert);
        setForm(prev => ({ ...prev, ...stored }));
      })
      .catch(() => toast.error('Failed to load child data'))
      .finally(() => setLoading(false));
  }, [id]);

  const dropdownOptions = useMemo(() => {
    const cert = certificate || {};

    const fatherFromCert = joinNameParts([cert.fatherFirst, cert.fatherMiddle, cert.fatherLast]);
    const motherFromCert = joinNameParts([cert.motherFirst, cert.motherMiddle, cert.motherLast]);
    const childFromCert = joinNameParts([cert.childFirst, cert.childMiddle, cert.childLast]);

    const dobFromCert = (() => {
      const y = trimStr(cert.birthYear);
      const m = trimStr(cert.birthMonth);
      const d = trimStr(cert.birthDay);
      if (!y || !m || !d) return '';
      const yi = Number(y);
      const mi = Number(m);
      const di = Number(d);
      return formatLongUpperDate(yi, mi, di);
    })();

    const pobFromCert = (() => {
      const city = trimStr(cert.placeOfBirthCity).toUpperCase();
      const province = trimStr(cert.placeOfBirthProvince).toUpperCase();
      if (!city && !province) return '';
      if (city && province) return `${city}, ${province}`;
      return city || province;
    })();

    const registeredName = trimStr(
      cert.registeredByName || cert.registered_by_name || cert.registeredName,
    ).toUpperCase();
    const registeredTitle = trimStr(
      cert.registeredByTitle || cert.registered_by_title || cert.registeredTitle,
    ).toUpperCase();

    const basePeople = [fatherFromCert, motherFromCert].filter(Boolean);

    return {
      fatherName: [fatherFromCert].filter(Boolean),
      motherName: [motherFromCert].filter(Boolean),
      childName: [childFromCert].filter(Boolean),
      dob: [dobFromCert].filter(Boolean),
      pob: [pobFromCert].filter(Boolean),
      fatherSignatureName: [fatherFromCert].filter(Boolean),
      motherSignatureName: [motherFromCert].filter(Boolean),
      swornBy1: [fatherFromCert].filter(Boolean),
      swornBy2: [fatherFromCert].filter(Boolean),
      nameInPrint: [registeredName].filter(Boolean),
      position: [registeredTitle].filter(Boolean),
    };
  }, [certificate]);

  useEffect(() => {
    if (loading || !id) return;
    const timeout = setTimeout(() => {
      childrenApi.updatePaternityAffidavit(id, form)
        .then(() => toast.success('Saved', { id: 'paternity-save' }))
        .catch(() => {});
    }, 1000);
    return () => clearTimeout(timeout);
  }, [form, id, loading]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600">
          ← Back to Applicant
        </Link>
      </div>

      <div 
        className="bg-white p-8 shadow-lg border-[12px] border-emerald-600 relative overflow-hidden"
        style={{ fontFamily: FONT_FAMILY, minHeight: '10.5in' }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">AFFIDAVIT OF ACKNOWLEDGMENT/ADMISSION OF PATERNITY</h1>
          <div className="flex justify-around text-xs mt-1 italic">
            <span>(For births before 3 August 1988)</span>
            <span>(For births on or after 3 August 1988)</span>
          </div>
        </div>

        <div className="space-y-6 text-base leading-relaxed">
          <div className="flex flex-wrap items-baseline gap-2">
            <span>I/We,</span>
            <FormTextCombo
              value={form.fatherName}
              onInputChange={(v) => update('fatherName', v)}
              suggestionOptions={dropdownOptions.fatherName}
              placeholder="(Father's name)"
              width="w-64"
              ariaLabel="Father name"
            />
            <span>and</span>
            <FormTextCombo
              value={form.motherName}
              onInputChange={(v) => update('motherName', v)}
              suggestionOptions={dropdownOptions.motherName}
              placeholder="(Mother's name)"
              width="w-64"
              ariaLabel="Mother name"
            />
            <span>,</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>of legal age, am/are the natural mother and/or father of</span>
            <FormTextCombo
              value={form.childName}
              onInputChange={(v) => update('childName', v)}
              suggestionOptions={dropdownOptions.childName}
              placeholder="(Child's name)"
              width="w-80"
              ariaLabel="Child name"
            />
            <span>, who was</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>born on</span>
            <FormTextCombo
              value={form.dob}
              onInputChange={(v) => update('dob', v)}
              suggestionOptions={dropdownOptions.dob}
              placeholder="(Date of birth)"
              width="w-48"
              ariaLabel="Date of birth"
            />
            <span>at</span>
            <FormTextCombo
              value={form.pob}
              onInputChange={(v) => update('pob', v)}
              suggestionOptions={dropdownOptions.pob}
              placeholder="(Place of birth)"
              width="flex-1"
              ariaLabel="Place of birth (city, province)"
            />
            <span>.</span>
          </div>

          <p className="mt-8">
            I am / We are executing this affidavit to attest to the truthfulness of the foregoing statements and for purposes of acknowledging my/our child.
          </p>

          <div className="grid grid-cols-2 gap-12 mt-12 pt-8">
            <div className="text-center">
              <div className="mb-1">
                <FormTextCombo
                  value={form.fatherSignatureName}
                  onInputChange={(v) => update('fatherSignatureName', v)}
                  suggestionOptions={dropdownOptions.fatherSignatureName}
                  placeholder="(Father printed name)"
                  width="w-full"
                  className="text-center font-bold uppercase"
                  ariaLabel="Father signature printed name"
                />
              </div>
              <p className="text-xs">(Signature Over Printed Name of Father)</p>
            </div>
            <div className="text-center">
              <div className="mb-1">
                <FormTextCombo
                  value={form.motherSignatureName}
                  onInputChange={(v) => update('motherSignatureName', v)}
                  suggestionOptions={dropdownOptions.motherSignatureName}
                  placeholder="(Mother printed name)"
                  width="w-full"
                  className="text-center font-bold uppercase"
                  ariaLabel="Mother signature printed name"
                />
              </div>
              <p className="text-xs">(Signature Over Printed Name of Mother)</p>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="font-bold">SUBSCRIBED AND SWORN</span>
              <span>to before me this</span>
              <FormLine value={form.swornDay} onChange={v => update('swornDay', v)} placeholder="(Day)" width="w-16" />
              <span>day of</span>
              <FormLine value={form.swornMonth} onChange={v => update('swornMonth', v)} placeholder="(Month)" width="w-32" />
              <span>,</span>
              <FormLine value={form.swornYear} onChange={v => update('swornYear', v)} placeholder="(Year)" width="w-20" />
              <span>by</span>
            </div>

            <div className="flex items-baseline gap-2">
              <FormTextCombo
                value={form.swornBy1}
                onInputChange={(v) => update('swornBy1', v)}
                suggestionOptions={dropdownOptions.swornBy1}
                placeholder="(Name)"
                width="w-64"
                ariaLabel="Sworn by name 1"
              />
              <span>and</span>
              <FormTextCombo
                value={form.swornBy2}
                onInputChange={(v) => update('swornBy2', v)}
                suggestionOptions={dropdownOptions.swornBy2}
                placeholder="(Name)"
                width="w-64"
                ariaLabel="Sworn by name 2"
              />
              <span>, who exhibited to me (his/her)</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span>CTC/Valid ID -</span>
              <FormLine value={form.ctcNo} onChange={v => update('ctcNo', v)} placeholder="(CTC / Valid ID no.)" width="w-48" />
              <span>issued on</span>
              <FormLine value={form.issuedOn} onChange={v => update('issuedOn', v)} placeholder="(Date issued)" width="w-48" />
              <span>at</span>
            </div>

            <div className="flex items-baseline gap-2">
              <FormLine value={form.issuedAt} onChange={v => update('issuedAt', v)} placeholder="(Place issued)" width="w-80" />
              <span>.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-16">
            <div className="space-y-4">
              <div className="text-center">
                <div className="border-b border-green-600 h-8 mb-1"></div>
                <p className="text-xs">Signature of the Administering Officer</p>
              </div>
              <div className="text-center">
                <FormTextCombo
                  value={form.nameInPrint}
                  onInputChange={(v) => update('nameInPrint', v)}
                  suggestionOptions={dropdownOptions.nameInPrint}
                  placeholder="(Name in print)"
                  width="w-full"
                  className="text-center uppercase font-bold"
                  ariaLabel="Registered by name in print"
                />
                <p className="text-xs border-t border-green-600 pt-1">Name in Print</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <FormTextCombo
                  value={form.position}
                  onInputChange={(v) => update('position', v)}
                  suggestionOptions={dropdownOptions.position}
                  placeholder="(Position / Title / Designation)"
                  width="w-full"
                  className="text-center"
                  ariaLabel="Registered by position or title"
                />
                <p className="text-xs border-t border-green-600 pt-1">Position / Title / Designation</p>
              </div>
              <div className="text-center">
                <FormLine value={form.address} onChange={v => update('address', v)} placeholder="(Address)" width="w-full" className="text-center" />
                <p className="text-xs border-t border-green-600 pt-1">Address</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}