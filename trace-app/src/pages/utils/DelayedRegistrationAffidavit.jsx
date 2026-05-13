import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const NOT_APPLICABLE_LABEL = 'NOT APPLICABLE';

function asUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function joinUpper(parts) {
  return parts.map(asUpper).filter(Boolean).join(' ');
}

function splitPlaceSegments(value) {
  return String(value || '')
    .split(',')
    .map((segment) => asUpper(segment))
    .filter(Boolean);
}

function parseChildCityProvince(child) {
  const placeSegments = splitPlaceSegments(child?.place_of_birth);
  if (placeSegments.length >= 2) {
    return {
      city: placeSegments[placeSegments.length - 2],
      province: placeSegments[placeSegments.length - 1],
    };
  }
  return { city: '', province: '' };
}

function toUpperLongDate(rawDate) {
  if (!rawDate) return '';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

/** Long uppercase date from COLB 20a parts (e.g. APRIL 10, 2026) for retrieve-data suggestions on the affidavit. */
function formatSuggestionFromCertMarriageDate(cert) {
  if (!cert || typeof cert !== 'object') return '';
  const y = String(cert.marriageYear || '').trim();
  const m = String(cert.marriageMonth || '').trim();
  const d = String(cert.marriageDay || '').trim();
  if (!y || !m || !d) return '';
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (!Number.isInteger(yi) || yi < 1000 || yi > 9999) return '';
  if (!Number.isInteger(mi) || mi < 1 || mi > 12) return '';
  if (!Number.isInteger(di) || di < 1 || di > 31) return '';
  const date = new Date(yi, mi - 1, di);
  if (date.getFullYear() !== yi || date.getMonth() !== mi - 1 || date.getDate() !== di) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

/** City and province for suggestions (e.g. ILIGAN CITY, LANAO DEL NORTE). */
function formatCityProvinceComma(city, province) {
  const c = asUpper(city);
  const p = asUpper(province);
  if (!c && !p) return '';
  if (!p) return c;
  if (!c) return p;
  return `${c}, ${p}`;
}

/** COLB 20b city and province only (matches affidavit marriage place line). */
function formatSuggestionFromCertMarriagePlace(cert) {
  if (!cert || typeof cert !== 'object') return '';
  const city = String(cert.marriagePlaceCity || '').trim();
  const province = String(cert.marriagePlaceProvince || '').trim();
  return formatCityProvinceComma(city, province);
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
            if (showList) {
              e.preventDefault();
              applyItem(suggestions[activeIndex]);
            }
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

function FormLine({ value = '', onChange, placeholder, width = 'flex-1', className = '', suggestionOptions = [], includeNotApplicable = true }) {
  return (
    <FormTextCombo
      value={value}
      onInputChange={onChange}
      suggestionOptions={suggestionOptions}
      placeholder={placeholder}
      width={width}
      className={className}
      includeNotApplicable={includeNotApplicable}
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
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const formRef = useRef(null);
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
    affiantSignature: '',
    position: '',
    nameInPrint: '',
    address: '',
  });

  useEffect(() => {
    if (!id) return;
    childrenApi.get(id)
      .then(data => {
        setChild(data);
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

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.defaultPrevented && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      const container = formRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      ).filter((el) => {
        const isVisible = el.offsetWidth > 0 || el.offsetHeight > 0;
        return el.tabIndex >= 0 && isVisible;
      });

      const index = focusable.indexOf(e.target);
      if (index > -1 && index < focusable.length - 1) {
        e.preventDefault();
        focusable[index + 1].focus();
      }
    }
  }, []);

  const cert = child?.certificate_of_live_birth && typeof child.certificate_of_live_birth === 'object'
    ? child.certificate_of_live_birth
    : {};
  const childName = useMemo(
    () => joinUpper([child?.first_name, child?.middle_name, child?.last_name]),
    [child],
  );
  const fatherName = useMemo(
    () => joinUpper([cert?.fatherFirst, cert?.fatherMiddle, cert?.fatherLast, child?.father_name]),
    [cert, child],
  );
  const childBirthDate = useMemo(() => toUpperLongDate(child?.date_of_birth), [child]);
  const childCityProvince = useMemo(() => parseChildCityProvince(child), [child]);
  const childPlace = useMemo(
    () => formatCityProvinceComma(childCityProvince.city, childCityProvince.province),
    [childCityProvince],
  );
  const attendedBySuggestion = useMemo(() => asUpper(cert?.attendantName), [cert]);
  const attendantAddressSuggestion = useMemo(() => asUpper(cert?.attendantAddress), [cert]);
  const registeredNameSuggestion = useMemo(() => asUpper(cert?.registeredByName), [cert]);
  const registeredPositionSuggestion = useMemo(() => asUpper(cert?.registeredByTitle), [cert]);
  const affiantNameSuggestions = useMemo(() => (childName ? [childName] : []), [childName]);
  const affiantSignatureSuggestions = useMemo(
    () => (asUpper(form.affiantName) ? [asUpper(form.affiantName)] : []),
    [form.affiantName],
  );
  const childPlaceSuggestions = useMemo(() => (childPlace ? [childPlace] : []), [childPlace]);
  const childDateSuggestions = useMemo(() => (childBirthDate ? [childBirthDate] : []), [childBirthDate]);
  const attendedBySuggestions = useMemo(
    () => (attendedBySuggestion ? [attendedBySuggestion] : []),
    [attendedBySuggestion],
  );
  const attendantAddressSuggestions = useMemo(
    () => (attendantAddressSuggestion ? [attendantAddressSuggestion] : []),
    [attendantAddressSuggestion],
  );
  const fatherNameSuggestions = useMemo(() => (fatherName ? [fatherName] : []), [fatherName]);
  const nameInPrintSuggestions = useMemo(
    () => (registeredNameSuggestion ? [registeredNameSuggestion] : []),
    [registeredNameSuggestion],
  );
  const positionSuggestions = useMemo(
    () => (registeredPositionSuggestion ? [registeredPositionSuggestion] : []),
    [registeredPositionSuggestion],
  );
  const commonPlaceSuggestions = useMemo(() => ['ILIGAN CITY, LANAO DEL NORTE'], []);
  const certMarriageDateSuggestions = useMemo(() => {
    const c =
      child?.certificate_of_live_birth && typeof child.certificate_of_live_birth === 'object'
        ? child.certificate_of_live_birth
        : null;
    const s = formatSuggestionFromCertMarriageDate(c || {});
    return s ? [s] : [];
  }, [child?.certificate_of_live_birth]);
  const certMarriagePlaceSuggestions = useMemo(() => {
    const c =
      child?.certificate_of_live_birth && typeof child.certificate_of_live_birth === 'object'
        ? child.certificate_of_live_birth
        : null;
    const s = formatSuggestionFromCertMarriagePlace(c || {});
    return s ? [s] : [];
  }, [child?.certificate_of_live_birth]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600">
          ← Back to Applicant
        </Link>
      </div>

      <form 
        ref={formRef}
        onKeyDown={handleKeyDown}
        onSubmit={(e) => e.preventDefault()}
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
            <FormTextCombo
              value={form.affiantName}
              onInputChange={v => update('affiantName', v)}
              suggestionOptions={affiantNameSuggestions}
              placeholder="(Affiant's name)"
              width="w-80"
              includeNotApplicable={false}
              ariaLabel="Affiant name"
            />
            <span>, of legal age, single/married/divorced/widow/widower, with</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>residence and postal address at</span>
            <FormLine
              value={form.residence}
              onChange={v => update('residence', v)}
              placeholder="(Residence and postal address)"
              width="flex-1"
              suggestionOptions={commonPlaceSuggestions}
            />
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
                    <FormTextCombo
                      value={form.selfBirthPlace}
                      onInputChange={v => update('selfBirthPlace', v)}
                      suggestionOptions={childPlaceSuggestions}
                      placeholder="(Place of birth)"
                      width="w-64"
                      includeNotApplicable={false}
                      ariaLabel="Self birth place"
                    />
                    <span>on</span>
                    <FormTextCombo
                      value={form.selfBirthDate}
                      onInputChange={v => update('selfBirthDate', v)}
                      suggestionOptions={childDateSuggestions}
                      placeholder="(Date of birth)"
                      width="w-40"
                      includeNotApplicable={false}
                      ariaLabel="Self birth date"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Checkbox checked={form.isOtherBirth} onChange={v => update('isOtherBirth', v)} />
                  <div className="flex-1 flex flex-wrap items-baseline gap-2">
                    <span>the birth of</span>
                    <FormTextCombo
                      value={form.otherBirthName}
                      onInputChange={v => update('otherBirthName', v)}
                      suggestionOptions={affiantNameSuggestions}
                      placeholder="(Child's name)"
                      width="w-64"
                      includeNotApplicable={false}
                      ariaLabel="Other birth child name"
                    />
                    <span>who was born in</span>
                    <FormTextCombo
                      value={form.otherBirthPlace}
                      onInputChange={v => update('otherBirthPlace', v)}
                      suggestionOptions={childPlaceSuggestions}
                      placeholder="(Place of birth)"
                      width="w-64"
                      includeNotApplicable={false}
                      ariaLabel="Other birth place"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-4 pl-8">
                  <div className="flex-1 flex flex-wrap items-baseline gap-2">
                    <span>on</span>
                    <FormTextCombo
                      value={form.otherBirthDate}
                      onInputChange={v => update('otherBirthDate', v)}
                      suggestionOptions={childDateSuggestions}
                      placeholder="(Date of birth)"
                      width="w-40"
                      includeNotApplicable={false}
                      ariaLabel="Other birth date"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">2.</span>
              <span>That I/he/she was attended at birth by</span>
              <FormTextCombo
                value={form.attendedBy}
                onInputChange={v => update('attendedBy', v)}
                suggestionOptions={attendedBySuggestions}
                placeholder="(Name of attendant)"
                width="w-80"
                includeNotApplicable={false}
                ariaLabel="Attended by"
              />
              <span>who resides at</span>
              <FormTextCombo
                value={form.attendantAddress}
                onInputChange={v => update('attendantAddress', v)}
                suggestionOptions={attendantAddressSuggestions}
                placeholder="(Address)"
                width="flex-1"
                includeNotApplicable={false}
                ariaLabel="Attendant address"
              />
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">3.</span>
              <span>That I am/he/she is a citizen of</span>
              <FormLine value={form.citizenship} onChange={v => update('citizenship', v)} placeholder="(Citizenship)" width="w-64" suggestionOptions={['PHILIPPINES']} includeNotApplicable={false} />
              <span>.</span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-4">
                <span className="font-bold">4.</span>
                <span>That my/his/her parents were</span>
                <Checkbox checked={form.isMarried} onChange={v => update('isMarried', v)} label="married on" />
                <FormTextCombo
                  value={form.marriageDate}
                  onInputChange={v => update('marriageDate', v)}
                  suggestionOptions={certMarriageDateSuggestions}
                  placeholder="(Marriage date)"
                  width="w-56"
                  includeNotApplicable={false}
                  ariaLabel="Marriage date"
                />
                <span>at</span>
                <FormTextCombo
                  value={form.marriagePlace}
                  onInputChange={v => update('marriagePlace', v)}
                  suggestionOptions={certMarriagePlaceSuggestions}
                  placeholder="(Place of marriage)"
                  width="w-48"
                  includeNotApplicable={false}
                  ariaLabel="Place of marriage"
                />
              </div>
              <div className="flex flex-wrap items-start gap-4 pl-8">
                <Checkbox checked={form.isNotMarried} onChange={v => update('isNotMarried', v)} />
                <div className="flex-1 flex flex-wrap items-baseline gap-2">
                  <span>not married but I/he/she was acknowledged/not acknowledged by my/his/her</span>
                </div>
              </div>
              <div className="pl-14 flex flex-wrap items-baseline gap-2">
                <span>father whose name is</span>
                <FormTextCombo
                  value={form.fatherName}
                  onInputChange={v => update('fatherName', v)}
                  suggestionOptions={fatherNameSuggestions}
                  placeholder="(Father's name)"
                  width="w-80"
                  includeNotApplicable={false}
                  ariaLabel="Father name"
                />
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
              <FormLine
                value={form.affixedAt}
                onChange={v => update('affixedAt', v)}
                placeholder="(City / place)"
                width="w-80"
                suggestionOptions={commonPlaceSuggestions}
              />
              <span>, Philippines.</span>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <div className="text-center w-80">
              <FormTextCombo
                value={form.affiantSignature}
                onInputChange={v => update('affiantSignature', v)}
                suggestionOptions={affiantSignatureSuggestions}
                placeholder="(Signature)"
                width="w-full"
                className="text-center mb-1"
                includeNotApplicable={false}
                ariaLabel="Affiant signature"
              />
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
              <FormLine
                value={form.swornAt}
                onChange={v => update('swornAt', v)}
                placeholder="(City / place)"
                width="w-80"
                suggestionOptions={commonPlaceSuggestions}
              />
              <span>, Philippines, affiant who exhibited to me his Community Tax Cert.</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <FormLine value={form.ctcNo} onChange={v => update('ctcNo', v)} placeholder="(Community Tax Cert. no.)" width="w-48" />
              <span>issued on</span>
              <FormLine value={form.issuedOn} onChange={v => update('issuedOn', v)} placeholder="(Date issued)" width="w-48" />
              <span>at</span>
              <FormLine
                value={form.issuedAt}
                onChange={v => update('issuedAt', v)}
                placeholder="(Place issued)"
                width="w-64"
                suggestionOptions={commonPlaceSuggestions}
              />
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
                <FormTextCombo
                  value={form.nameInPrint}
                  onInputChange={v => update('nameInPrint', v)}
                  suggestionOptions={nameInPrintSuggestions}
                  placeholder="(Name in print)"
                  width="w-full"
                  className="text-center uppercase font-bold"
                  includeNotApplicable={false}
                  ariaLabel="Name in print"
                />
                <p className="text-xs border-t border-green-600 pt-1">Name in Print</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <FormTextCombo
                  value={form.position}
                  onInputChange={v => update('position', v)}
                  suggestionOptions={positionSuggestions}
                  placeholder="(Position / Title / Designation)"
                  width="w-full"
                  className="text-center"
                  includeNotApplicable={false}
                  ariaLabel="Position title designation"
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
      </form>
       <div className="mt-5 mb-6 flex items-center justify-between print:hidden">
        <Link to={applicantDetailPath(basePath, id)} className="text-sm font-medium text-emerald-600">
          ← Back to Applicant
        </Link>
      </div>
    </div>
  );
}