import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const NOT_APPLICABLE_LABEL = 'NOT APPLICABLE';

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
        style={{ fontFamily: FONT_FAMILY, fontSize: '14px' }}
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
      ariaLabel={placeholder || 'Text field'}
    />
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 border-green-600 text-green-600 rounded focus:ring-green-500"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function DelayedRegistrationAffidavit() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    affiantName: '',
    residence: '',
    isSelfBirth: false,
    selfBirthPlace: '',
    selfBirthDate: '',
    isOtherBirth: false,
    otherBirthName: '',
    otherBirthPlace: '',
    otherBirthDate: '',
    attendedBy: '',
    attendantAddress: '',
    citizenship: '',
    isMarried: false,
    marriageDate: '',
    marriagePlace: '',
    isNotMarried: false,
    fatherName: '',
    delayReason: '',
    spouseName: '',
    relationship: '',
    affixedDay: '',
    affixedMonth: '',
    affixedAt: '',
    swornDay: '',
    swornMonth: '',
    swornYear: '',
    swornAt: '',
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
        const stored = data.delayed_registration_affidavit || {};
        setForm(prev => ({ ...prev, ...stored }));
      })
      .catch(() => toast.error('Failed to load child data'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (loading || !id) return;
    const timeout = setTimeout(() => {
      childrenApi.updateDelayedRegistrationAffidavit(id, form)
        .then(() => toast.success('Saved', { id: 'delayed-save' }))
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
        style={{ fontFamily: FONT_FAMILY, minHeight: '13in' }}
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight">AFFIDAVIT FOR DELAYED REGISTRATION OF BIRTH</h1>
          <p className="text-[10px] italic mt-1">
            (To be accomplished by the hospital/clinic administrator, father, mother, or guardian or the person himself if 18 years old or over.)
          </p>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-900">
          <div className="flex flex-wrap items-baseline gap-2">
            <span>I,</span>
            <FormLine value={form.affiantName} onChange={v => update('affiantName', v)} placeholder="(Affiant's name)" width="w-80" />
            <span>, of legal age, single/married/divorced/widow/widower, with</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>residence and postal address at</span>
            <FormLine value={form.residence} onChange={v => update('residence', v)} placeholder="(Residence and postal address)" width="flex-1" />
          </div>

          <p>after having been duly sworn in accordance with law, do hereby depose and say:</p>

          <div className="pl-6 space-y-4">
            <div>
              <p className="flex items-baseline gap-2 mb-2">
                <span className="font-bold">1.</span>
                <span>That I am the applicant for the delayed registration of:</span>
              </p>
              <div className="pl-6 space-y-3">
                <div className="flex items-start gap-4">
                  <Checkbox checked={form.isSelfBirth} onChange={v => update('isSelfBirth', v)} />
                  <div className="flex-1 flex flex-wrap items-baseline gap-2">
                    <span>my birth in</span>
                    <FormLine value={form.selfBirthPlace} onChange={v => update('selfBirthPlace', v)} placeholder="(Place of birth)" width="w-64" />
                    <span>on</span>
                    <FormLine value={form.selfBirthDate} onChange={v => update('selfBirthDate', v)} placeholder="(Date of birth)" width="w-40" />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Checkbox checked={form.isOtherBirth} onChange={v => update('isOtherBirth', v)} />
                  <div className="flex-1 flex flex-wrap items-baseline gap-2">
                    <span>the birth of</span>
                    <FormLine value={form.otherBirthName} onChange={v => update('otherBirthName', v)} placeholder="(Child's name)" width="w-64" />
                    <span>who was born in</span>
                    <FormLine value={form.otherBirthPlace} onChange={v => update('otherBirthPlace', v)} placeholder="(Place of birth)" width="w-64" />
                  </div>
                </div>
                <div className="flex items-start gap-4 pl-8">
                  <div className="flex-1 flex flex-wrap items-baseline gap-2">
                    <span>on</span>
                    <FormLine value={form.otherBirthDate} onChange={v => update('otherBirthDate', v)} placeholder="(Date of birth)" width="w-40" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">2.</span>
              <span>That I/he/she was attended at birth by</span>
              <FormLine value={form.attendedBy} onChange={v => update('attendedBy', v)} placeholder="(Name of attendant)" width="w-80" />
              <span>who resides at</span>
              <FormLine value={form.attendantAddress} onChange={v => update('attendantAddress', v)} placeholder="(Address)" width="flex-1" />
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">3.</span>
              <span>That I am/he/she is a citizen of</span>
              <FormLine value={form.citizenship} onChange={v => update('citizenship', v)} placeholder="(Citizenship)" width="w-64" />
              <span>.</span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-4">
                <span className="font-bold">4.</span>
                <span>That my/his/her parents were</span>
                <Checkbox checked={form.isMarried} onChange={v => update('isMarried', v)} label="married on" />
                <FormLine value={form.marriageDate} onChange={v => update('marriageDate', v)} placeholder="(Marriage date)" width="w-40" />
                <span>at</span>
                <FormLine value={form.marriagePlace} onChange={v => update('marriagePlace', v)} placeholder="(Place of marriage)" width="w-48" />
              </div>
              <div className="flex flex-wrap items-start gap-4 pl-8">
                <Checkbox checked={form.isNotMarried} onChange={v => update('isNotMarried', v)} />
                <div className="flex-1 flex flex-wrap items-baseline gap-2">
                  <span>not married but I/he/she was acknowledged/not acknowledged by my/his/her</span>
                </div>
              </div>
              <div className="pl-14 flex flex-wrap items-baseline gap-2">
                <span>father whose name is</span>
                <FormLine value={form.fatherName} onChange={v => update('fatherName', v)} placeholder="(Father's name)" width="w-80" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">5.</span>
              <span>That the reason for the delay in registering my/his/her birth was</span>
              <FormLine value={form.delayReason} onChange={v => update('delayReason', v)} placeholder="(Reason for delay)" width="flex-1" />
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">6.</span>
              <span>(For the applicant only) That I am married to</span>
              <FormLine value={form.spouseName} onChange={v => update('spouseName', v)} placeholder="(Spouse's name)" width="w-80" />
              <span>.</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 pl-6">
              <span>(If the applicant is other than the document owner) That I am the</span>
              <FormLine value={form.relationship} onChange={v => update('relationship', v)} placeholder="(e.g. Mother, Guardian)" width="w-64" />
              <span>of the said person.</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">7.</span>
              <span>That I am executing this affidavit to attest to the truthfulness of the foregoing statements for all legal intents and purposes.</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span>In truth whereof, I have affixed my signature below this</span>
              <FormLine value={form.affixedDay} onChange={v => update('affixedDay', v)} placeholder="(Day)" width="w-16" />
              <span>day of</span>
              <FormLine value={form.affixedMonth} onChange={v => update('affixedMonth', v)} placeholder="(Month)" width="w-32" />
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span>at</span>
              <FormLine value={form.affixedAt} onChange={v => update('affixedAt', v)} placeholder="(City / place)" width="w-80" />
              <span>, Philippines.</span>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <div className="text-center w-80">
              <div className="border-b border-green-600 h-8 mb-1"></div>
              <p className="text-xs">(Signature Over Printed Name of Affiant)</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold uppercase">Subscribed and Sworn</span>
              <span>to before me this</span>
              <FormLine value={form.swornDay} onChange={v => update('swornDay', v)} placeholder="(Day)" width="w-16" />
              <span>day of</span>
              <FormLine value={form.swornMonth} onChange={v => update('swornMonth', v)} placeholder="(Month)" width="w-32" />
              <span>,</span>
              <FormLine value={form.swornYear} onChange={v => update('swornYear', v)} placeholder="(Year)" width="w-20" />
              <span>at</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <FormLine value={form.swornAt} onChange={v => update('swornAt', v)} placeholder="(City / place)" width="w-80" />
              <span>, Philippines, affiant who exhibited to me his Community Tax Cert.</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <FormLine value={form.ctcNo} onChange={v => update('ctcNo', v)} placeholder="(Community Tax Cert. no.)" width="w-48" />
              <span>issued on</span>
              <FormLine value={form.issuedOn} onChange={v => update('issuedOn', v)} placeholder="(Date issued)" width="w-48" />
              <span>at</span>
              <FormLine value={form.issuedAt} onChange={v => update('issuedAt', v)} placeholder="(Place issued)" width="w-64" />
              <span>.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="space-y-4">
              <div className="text-center">
                <div className="border-b border-green-600 h-8 mb-1"></div>
                <p className="text-xs">Signature of the Administering Officer</p>
              </div>
              <div className="text-center">
                <FormLine value={form.nameInPrint} onChange={v => update('nameInPrint', v)} placeholder="(Name in print)" width="w-full" className="text-center uppercase font-bold" />
                <p className="text-xs border-t border-green-600 pt-1">Name in Print</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <FormLine value={form.position} onChange={v => update('position', v)} placeholder="(Position / Title / Designation)" width="w-full" className="text-center" />
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