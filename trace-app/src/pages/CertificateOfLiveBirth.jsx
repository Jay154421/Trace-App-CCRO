import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { childrenApi } from '../services/api';

const DEFAULT_PROVINCE = 'Lanao Del Norte';
const DEFAULT_CITY_MUNICIPALITY = 'Iligan City';

const DEFAULT_CERT = {
  registryNo: '',
  province: DEFAULT_PROVINCE,
  cityMunicipality: DEFAULT_CITY_MUNICIPALITY,
  childFirst: '',
  childMiddle: '',
  childLast: '',
  sex: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  placeOfBirthName: '',
  placeOfBirthCity: '',
  placeOfBirthProvince: '',
  typeOfBirth: '',
  multipleBirthOrder: '',
  birthOrder: '',
  weightGrams: '',
  motherFirst: '',
  motherMiddle: '',
  motherLast: '',
  motherCitizenship: '',
  motherReligion: '',
  motherChildrenBornAlive: '',
  motherChildrenLiving: '',
  motherChildrenDead: '',
  motherOccupation: '',
  motherAge: '',
  motherResidenceLine1: '',
  motherResidenceCity: '',
  motherResidenceProvince: '',
  motherResidenceCountry: '',
  fatherFirst: '',
  fatherMiddle: '',
  fatherLast: '',
  fatherCitizenship: '',
  fatherReligion: '',
  fatherOccupation: '',
  fatherAge: '',
  fatherResidenceLine1: '',
  fatherResidenceCity: '',
  fatherResidenceProvince: '',
  fatherResidenceCountry: '',
  marriageMonth: '',
  marriageDay: '',
  marriageYear: '',
  marriagePlace: '',
  attendantType: '',
  attendantOthersSpecify: '',
  attendantTime: '',
  attendantAmpm: 'am',
  attendantSignature: '',
  attendantName: '',
  attendantAddress: '',
  attendantTitle: '',
  attendantDate: '',
  informantSignature: '',
  informantName: '',
  informantAddress: '',
  informantRelationship: '',
  informantDate: '',
  preparedBySignature: '',
  preparedByName: '',
  preparedByTitle: '',
  preparedByDate: '',
  receivedBySignature: '',
  receivedByName: '',
  receivedByTitle: '',
  receivedByDate: '',
  registeredBySignature: '',
  registeredByName: '',
  registeredByTitle: '',
  registeredByDate: '',
  remarks: '',
};

const AUTO_SAVE_MS = 700;

const RECEIVED_BY_OPTIONS = [
  { name: 'ATTY. YUSSIF DON JUSTIN F. MARTIL', title: 'CITY CIVIL REGISTRAR' },
  { name: 'LORELIE L. CANTO', title: 'REGISTRATION OFFICER IV' },
  { name: 'PHOEBE L. BENIGA', title: 'REGISTRATION OFFICER II' },
  { name: 'JAN FLAURENCE A. OBLENDA', title: 'REGISTRATION OFFICER II' },
];

const SECTION_IDS = ['header', 'child', 'mother', 'father', 'marriage', 'attendant', 'signatures', 'remarks'];
const SECTION_LABELS = ['Header', 'Child', 'Mother', 'Father', 'Marriage', 'Attendant', 'Signatures', 'Remarks'];

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

// Pixel-perfect colors from Certificate of Live Birth (Municipal Form No. 102)
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  accentGreen: '#00CC00',           // Vibrant green lines/borders (top sections)
  inputBgBeige: '#FFF8DC',         // Cornsilk - input fields (top)
  sectionStripe: '#F0F8E8',       // Pale yellowish-green - section headers & inputs (lower)
  borderGray: '#AAAAAA',           // Medium dark gray - borders (lower sections)
  accentLightGreen: '#D4EFD4',     // Underline MARRIAGE OF PARENTS, bottom boxes
  placeholderGray: '#A9A9A9',
  iconGray: '#666666',
};

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <rect x="1" y="2" width="14" height="13" rx="0" stroke={COLORS.iconGray} strokeWidth="1.2" fill="none" />
      <line x1="1" y1="5" x2="15" y2="5" stroke={COLORS.iconGray} strokeWidth="1.2" />
      <line x1="5" y1="1" x2="5" y2="4" stroke={COLORS.iconGray} strokeWidth="1.2" />
      <line x1="11" y1="1" x2="11" y2="4" stroke={COLORS.iconGray} strokeWidth="1.2" />
    </svg>
  );
}

function QuillIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M2 12l2-2 6-6 2 2-6 6-2 2z" stroke={COLORS.iconGray} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4l2 2" stroke={COLORS.iconGray} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DropdownArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M2 4l4 4 4-4" stroke={COLORS.iconGray} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FormLine({ value = '', onChange, placeholder, className = '', width, readOnly, useLowerStyle = false }) {
  const borderColor = useLowerStyle ? COLORS.borderGray : COLORS.accentGreen;
  return (
    <input
      type="text"
      value={value}
      onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`focus:outline-none focus:ring-0 min-h-[1.25rem] ${width || 'flex-1 min-w-0'} ${className}`}
      style={{
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        backgroundColor: COLORS.white,
        border: useLowerStyle ? `1px solid ${COLORS.borderGray}` : 'none',
        borderBottom: useLowerStyle ? undefined : `1px solid ${borderColor}`,
        borderRadius: 0,
        padding: '2px 4px',
        color: COLORS.black,
      }}
    />
  );
}

function SectionStripe({ title, caption, children }) {
  return (
    <div style={{ border: `1px solid ${COLORS.borderGray}`, marginBottom: 0, borderRadius: 0 }}>
      <div style={{ backgroundColor: COLORS.sectionStripe, padding: '6px 8px', borderBottom: `1px solid ${COLORS.borderGray}` }}>
        <span style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: '15px', color: COLORS.black }}>{title}</span>
        {caption && <span style={{ fontFamily: FONT_FAMILY, fontSize: '15px', color: COLORS.black, marginLeft: '6px' }}>{caption}</span>}
      </div>
      <div style={{ padding: '8px', backgroundColor: COLORS.white }}>{children}</div>
    </div>
  );
}

function GreenRule() {
  return <hr className="border-0 my-2" style={{ height: 2, backgroundColor: COLORS.accentGreen }} />;
}

export function CertificateOfLiveBirth() {
  const { id } = useParams();
  const [child, setChild] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_CERT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const certContentRef = useRef(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  useEffect(() => {
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const cert = data.certificate_of_live_birth && typeof data.certificate_of_live_birth === 'object'
          ? data.certificate_of_live_birth
          : {};
        const base = { ...DEFAULT_CERT, ...cert };
        const fromChild = {
          province: base.province || DEFAULT_PROVINCE,
          cityMunicipality: base.cityMunicipality || DEFAULT_CITY_MUNICIPALITY,
          childFirst: base.childFirst || (data.first_name ?? ''),
          childMiddle: base.childMiddle || (data.middle_name ?? ''),
          childLast: base.childLast || (data.last_name ?? ''),
        };
        const { day, month, year } = parseDateOfBirth(data.date_of_birth);
        if (!base.birthDay && day) fromChild.birthDay = day;
        if (!base.birthMonth && month) fromChild.birthMonth = month;
        if (!base.birthYear && year) fromChild.birthYear = year;
        setForm({ ...base, ...fromChild });
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const defaultTitle = 'TRACE System';

  useEffect(() => {
    document.title = 'Certificate of Live Birth';
    return () => {
      document.title = defaultTitle;
    };
  }, []);

  useEffect(() => {
    const styleId = 'certificate-of-live-birth-print-size';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .certificate-of-live-birth-form input::placeholder,
      .certificate-of-live-birth-form textarea::placeholder { color: #A9A9A9; }
      .certificate-of-live-birth-form input:focus-visible,
      .certificate-of-live-birth-form textarea:focus-visible,
      .certificate-of-live-birth-form select:focus-visible { outline: 2px solid #00CC00; outline-offset: 2px; }
      .certificate-tabs-wrap { max-width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
      .certificate-tabs-nav { display: flex; gap: 0; border-bottom: 2px solid #e2e8f0; background: #f8fafc; padding: 0 0.5rem; min-height: 2.75rem; align-items: stretch; }
      .certificate-tab { flex-shrink: 0; padding: 0.5rem 1rem; font-size: 0.8125rem; font-weight: 500; color: #64748b; background: none; border: none; border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer; transition: color 0.15s, border-color 0.15s; font-family: inherit; }
      .certificate-tab:hover { color: #0f172a; }
      .certificate-tab.active { color: #059669; border-bottom-color: #059669; background: #fff; }
      .certificate-step-nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-top: 1px solid #e2e8f0; margin-top: 1rem; }
      .certificate-step-nav span { font-size: 0.8125rem; color: #64748b; }
      .certificate-tab-panel { display: none; }
      .certificate-tab-panel.active { display: block; }
      .certificate-card { border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; background: #fff; padding: 1.5rem; margin-bottom: 0; }
      @media print {
        @page { size: 8.5in 14in; margin: 0.25in; }
        aside[aria-label="Main navigation"] { display: none !important; }
        main[aria-label="Main content"] { flex: 1 1 100%; width: 100%; }
        body { height: 14in; overflow: hidden !important; }
        .certificate-section-nav { display: none !important; }
        .certificate-sticky-bar { display: none !important; }
        .certificate-tabs-wrap { display: none !important; }
        .certificate-step-nav { display: none !important; }
        .certificate-tab-panel { display: block !important; }
        .certificate-card { border-radius: 0 !important; box-shadow: none !important; border: none !important; margin-bottom: 0 !important; padding: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const save = useCallback(async () => {
    if (!id) return;
    const payload = { ...form };
    if (JSON.stringify(payload) === lastSavedRef.current) return;
    lastSavedRef.current = JSON.stringify(payload);
    setSaving(true);
    try {
      await childrenApi.updateCertificateOfLiveBirth(id, payload);
      toast.success('Saved');
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
      lastSavedRef.current = null;
    } finally {
      setSaving(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (!id || loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(save, AUTO_SAVE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [form, id, loading, save]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  const totalSteps = SECTION_IDS.length;
  const canPrev = activeTabIndex > 0;
  const canNext = activeTabIndex < totalSteps - 1;

  return (
    <div className="mx-auto pb-8 print:pb-0" style={{ width: '8.5in', maxWidth: '100%' }}>
      <div className="certificate-sticky-bar sticky top-0 z-10 mb-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
        <Link to={`/children/${id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to applicant</Link>
        <span className="truncate text-sm font-medium text-slate-700">
          {child.first_name} {child.last_name}
        </span>
        {saving && <span className="text-sm text-emerald-600">Saving…</span>}
      </div>

      <div className="certificate-tabs-wrap print:hidden">
        <nav className="certificate-tabs-nav" aria-label="Form sections">
          {SECTION_LABELS.map((label, i) => (
            <button
              key={SECTION_IDS[i]}
              type="button"
              onClick={() => setActiveTabIndex(i)}
              className={`certificate-tab ${activeTabIndex === i ? 'active' : ''}`}
              aria-current={activeTabIndex === i ? 'step' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div
        ref={certContentRef}
        className="certificate-of-live-birth-form mt-4"
        style={{
          fontFamily: FONT_FAMILY,
          width: '8.5in',
          maxWidth: '100%',
          fontSize: '15px',
          color: COLORS.black,
        }}
      >
          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 0 ? 'active' : ''}`} id="header">
            <header className="pb-3" style={{ borderBottom: `2px solid ${COLORS.accentGreen}` }}>
          <div className="text-center" style={{ marginTop: '8px' }}>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '15px', fontWeight: 400, color: COLORS.black, margin: 0 }}>Republic of the Philippines</p>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '16px', fontWeight: 400, color: COLORS.black, margin: '2px 0' }}>OFFICE OF THE CIVIL REGISTRAR GENERAL</p>
            <h1 className="text-center font-bold uppercase text-black mt-3 pb-2" style={{ fontFamily: FONT_FAMILY, fontSize: '20px', borderBottom: `2px solid ${COLORS.accentGreen}`, marginBottom: 0 }}>CERTIFICATE OF LIVE BIRTH</h1>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.accentGreen}`, paddingTop: '8px', fontFamily: FONT_FAMILY, fontSize: '16px', color: COLORS.black }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col min-w-0">
                <span className="mb-1">Province</span>
                <FormLine value={form.province} onChange={(v) => update('province', v)} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="mb-1">City/Municipality</span>
                <FormLine value={form.cityMunicipality} onChange={(v) => update('cityMunicipality', v)} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="mb-1">Registry No.</span>
                <FormLine value={form.registryNo} onChange={(v) => update('registryNo', v)} className="w-full" width="w-full" />
              </div>
            </div>
          </div>
            </header>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 1 ? 'active' : ''}`} id="child">
        <GreenRule />
        <div style={{ borderBottom: `2px solid ${COLORS.accentGreen}`, fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <h2 className="text-lg font-bold uppercase mb-4 pb-2" style={{ borderBottom: `1px solid ${COLORS.accentGreen}`, fontSize: '18px' }}>Child</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">1. NAME</label>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.childFirst} onChange={(v) => update('childFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.childMiddle} onChange={(v) => update('childMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.childLast} onChange={(v) => update('childLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">2. SEX (Male/Female)</label>
              <div className="flex items-center gap-1">
                <FormLine value={form.sex} onChange={(v) => update('sex', v)} className="w-28" width="w-28" />
                <DropdownArrowIcon />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">3. DATE OF BIRTH</label>
              <div className="flex flex-wrap gap-2 items-center">
                <FormLine value={form.birthDay} onChange={(v) => update('birthDay', v)} placeholder="(Day)" className="w-14" width="w-14" />
                <FormLine value={form.birthMonth} onChange={(v) => update('birthMonth', v)} placeholder="(Month)" className="w-20" width="w-20" />
                <FormLine value={form.birthYear} onChange={(v) => update('birthYear', v)} placeholder="(Year)" className="w-20" width="w-20" />
                <CalendarIcon />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">4. PLACE OF BIRTH</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.placeOfBirthName} onChange={(v) => update('placeOfBirthName', v)} placeholder="(Name of Hospital/Clinic/Institution/House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormLine value={form.placeOfBirthCity} onChange={(v) => update('placeOfBirthCity', v)} placeholder="(City/Municipality)" />
                  <FormLine value={form.placeOfBirthProvince} onChange={(v) => update('placeOfBirthProvince', v)} placeholder="(Province)" />
                </div>
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">5a. TYPE OF BIRTH</label>
              <FormLine value={form.typeOfBirth} onChange={(v) => update('typeOfBirth', v)} placeholder="(Single, Twin, Triplet, etc.)" className="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">5b. IF MULTIPLE BIRTH, CHILD WAS</label>
              <FormLine value={form.multipleBirthOrder} onChange={(v) => update('multipleBirthOrder', v)} placeholder="(First, Second, Third, etc.)" className="w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">5c. BIRTH ORDER</label>
              <p className="mb-1 text-slate-600" style={{ fontSize: '14px' }}>(Order of this birth to previous live births including fetal death)</p>
              <FormLine value={form.birthOrder} onChange={(v) => update('birthOrder', v)} placeholder="(First, Second, Third, etc.)" className="w-full max-w-xs" />
            </div>
            <div>
              <label className="block mb-1 font-normal">6. WEIGHT AT BIRTH</label>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.weightGrams} onChange={(v) => update('weightGrams', v)} className="w-24" width="w-24" />
                <span>grams</span>
              </div>
            </div>
          </div>
        </div>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 2 ? 'active' : ''}`} id="mother">
        <GreenRule />
        <div style={{ borderBottom: `2px solid ${COLORS.accentGreen}`, fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <h2 className="text-lg font-bold uppercase mb-4 pb-2" style={{ borderBottom: `1px solid ${COLORS.accentGreen}`, fontSize: '18px' }}>Mother</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">7. MAIDEN NAME</label>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.motherFirst} onChange={(v) => update('motherFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.motherMiddle} onChange={(v) => update('motherMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.motherLast} onChange={(v) => update('motherLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">8. CITIZENSHIP</label>
              <FormLine value={form.motherCitizenship} onChange={(v) => update('motherCitizenship', v)} className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">9. RELIGION/RELIGIOUS SECT</label>
              <FormLine value={form.motherReligion} onChange={(v) => update('motherReligion', v)} className="w-full" width="w-full" />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 font-normal">10a. Total number of children born alive</label>
                <FormLine value={form.motherChildrenBornAlive} onChange={(v) => update('motherChildrenBornAlive', v)} className="w-full" width="w-full" />
              </div>
              <div>
                <label className="block mb-1 font-normal">10b. No. of children still living including this birth</label>
                <FormLine value={form.motherChildrenLiving} onChange={(v) => update('motherChildrenLiving', v)} className="w-full" width="w-full" />
              </div>
              <div>
                <label className="block mb-1 font-normal">10c. No. of children born alive but are now dead</label>
                <FormLine value={form.motherChildrenDead} onChange={(v) => update('motherChildrenDead', v)} className="w-full" width="w-full" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">11. OCCUPATION</label>
              <FormLine value={form.motherOccupation} onChange={(v) => update('motherOccupation', v)} className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">12. AGE at the time of this birth (completed years)</label>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.motherAge} onChange={(v) => update('motherAge', v)} className="w-20" width="w-20" />
                <span style={{ fontSize: '14px' }}>#</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">13. RESIDENCE</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.motherResidenceLine1} onChange={(v) => update('motherResidenceLine1', v)} placeholder="(House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormLine value={form.motherResidenceCity} onChange={(v) => update('motherResidenceCity', v)} placeholder="(City/Municipality)" className="w-full" width="w-full" />
                  <FormLine value={form.motherResidenceProvince} onChange={(v) => update('motherResidenceProvince', v)} placeholder="(Province)" className="w-full" width="w-full" />
                  <FormLine value={form.motherResidenceCountry} onChange={(v) => update('motherResidenceCountry', v)} placeholder="(Country)" className="w-full" width="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 3 ? 'active' : ''}`} id="father">
        <GreenRule />
        <div style={{ borderBottom: `2px solid ${COLORS.accentGreen}`, fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <h2 className="text-lg font-bold uppercase mb-4 pb-2" style={{ borderBottom: `1px solid ${COLORS.accentGreen}`, fontSize: '18px' }}>Father</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" style={{ fontSize: '16px' }}>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">14. NAME</label>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.fatherFirst} onChange={(v) => update('fatherFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.fatherMiddle} onChange={(v) => update('fatherMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.fatherLast} onChange={(v) => update('fatherLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-normal">15. CITIZENSHIP</label>
              <FormLine value={form.fatherCitizenship} onChange={(v) => update('fatherCitizenship', v)} className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">16. RELIGION/RELIGIOUS SECT</label>
              <FormLine value={form.fatherReligion} onChange={(v) => update('fatherReligion', v)} className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">17. OCCUPATION</label>
              <FormLine value={form.fatherOccupation} onChange={(v) => update('fatherOccupation', v)} className="w-full" width="w-full" />
            </div>
            <div>
              <label className="block mb-1 font-normal">18. AGE at the time of this birth (completed years)</label>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.fatherAge} onChange={(v) => update('fatherAge', v)} className="w-20" width="w-20" />
                <span style={{ fontSize: '14px' }}>#</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-normal">19. RESIDENCE</label>
              <div className="space-y-2 w-full">
                <FormLine value={form.fatherResidenceLine1} onChange={(v) => update('fatherResidenceLine1', v)} placeholder="(House No., St., Barangay)" className="w-full" width="w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormLine value={form.fatherResidenceCity} onChange={(v) => update('fatherResidenceCity', v)} placeholder="(City/Municipality)" className="w-full" width="w-full" />
                  <FormLine value={form.fatherResidenceProvince} onChange={(v) => update('fatherResidenceProvince', v)} placeholder="(Province)" className="w-full" width="w-full" />
                  <FormLine value={form.fatherResidenceCountry} onChange={(v) => update('fatherResidenceCountry', v)} placeholder="(Country)" className="w-full" width="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 4 ? 'active' : ''}`} id="marriage">
        <div
          style={{
            fontFamily: FONT_FAMILY,
            color: COLORS.black,
            border: `1px solid ${COLORS.borderGray}`,
            borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            backgroundColor: COLORS.white,
          }}
        >
          <div style={{ height: 2, backgroundColor: COLORS.accentGreen, width: '100%' }} />
          <div style={{ padding: '14px 16px 18px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px', letterSpacing: '0.02em' }}>MARRIAGE OF PARENTS</p>
            <p style={{ fontSize: '14px', fontWeight: 400, marginBottom: 0, lineHeight: 1.45 }}>
              (If not married, accomplish Affidavit of Acknowledgement/Admission of Paternity at the back.)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-5 items-start" style={{ fontSize: '16px' }}>
              <div>
                <label className="block mb-2" style={{ fontWeight: 700 }}>
                  20a. DATE
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <FormLine
                    value={form.marriageMonth}
                    onChange={(v) => update('marriageMonth', v)}
                    placeholder="(Month)"
                    className="min-w-[7rem] flex-1 sm:flex-none sm:w-[7.5rem]"
                    width="min-w-[7rem] flex-1 sm:flex-none sm:w-[7.5rem]"
                    useLowerStyle
                  />
                  <FormLine
                    value={form.marriageDay}
                    onChange={(v) => update('marriageDay', v)}
                    placeholder="(Day)"
                    className="w-14 flex-shrink-0"
                    width="w-14"
                    useLowerStyle
                  />
                  <FormLine
                    value={form.marriageYear}
                    onChange={(v) => update('marriageYear', v)}
                    placeholder="(Year)"
                    className="w-[4.5rem] flex-shrink-0"
                    width="w-[4.5rem]"
                    useLowerStyle
                  />
                  <CalendarIcon />
                </div>
              </div>
              <div className="min-w-0">
                <label className="block mb-2" style={{ fontWeight: 700 }}>
                  20b. PLACE
                </label>
                <FormLine
                  value={form.marriagePlace}
                  onChange={(v) => update('marriagePlace', v)}
                  placeholder="(City / Municipality, Province, Country)"
                  className="w-full"
                  width="w-full"
                  useLowerStyle
                />
              </div>
            </div>
          </div>
        </div>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 5 ? 'active' : ''}`} id="attendant">
        <GreenRule />
        <SectionStripe title="21a. ATTENDANT">
          <div className="flex flex-wrap gap-4 items-center" style={{ fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.black }}>
            {[
              '1 Physician',
              '2 Nurse',
              '3 Midwife',
              '4 Hilot (Traditional Birth Attendant)',
              '5 Others (Specify)',
            ].map((label, i) => {
              const opt = ['Physician', 'Nurse', 'Midwife', 'Hilot (Traditional Birth Attendant)', 'Others'][i];
              return (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="attendantType"
                    checked={form.attendantType === opt}
                    onChange={() => update('attendantType', opt)}
                    className="sr-only"
                  />
                  <span
                    className="inline-block w-4 h-4 flex-shrink-0"
                    style={{ border: `1px solid ${COLORS.borderGray}`, borderRadius: 0, backgroundColor: form.attendantType === opt ? COLORS.black : COLORS.white }}
                  />
                  <span>{label}</span>
                  {opt === 'Others' && (
                    <FormLine value={form.attendantOthersSpecify} onChange={(v) => update('attendantOthersSpecify', v)} className="w-24 inline-block ml-0" width="w-24" useLowerStyle />
                  )}
                </label>
              );
            })}
          </div>
        </SectionStripe>

        <SectionStripe title="21b. CERTIFICATION OF ATTENDANT AT BIRTH" caption="(Physician, Nurse, Midwife, Traditional Birth Attendant/Hilot, etc.)">
          <p style={{ fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.black, marginBottom: '8px' }}>
            I hereby certify that I attended the birth of the child who was born alive at
            <span className="inline-flex items-baseline gap-1 mx-1 align-middle">
              <FormLine value={form.attendantTime} onChange={(v) => update('attendantTime', v)} placeholder="_ _ : _ _" className="w-16" width="w-16" useLowerStyle />
              <select value={form.attendantAmpm} onChange={(e) => update('attendantAmpm', e.target.value)} style={{ fontFamily: FONT_FAMILY, fontSize: '14px', backgroundColor: COLORS.white, border: `1px solid ${COLORS.borderGray}`, borderRadius: 0, padding: '2px 4px', color: COLORS.black }}>
                <option value="am">am</option>
                <option value="pm">pm</option>
              </select>
            </span>
            on the date of birth specified above.
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4"
            style={{ fontSize: '14px' }}
          >
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
              <div className="flex items-center gap-1">
                <QuillIcon />
                <FormLine value={form.attendantSignature} onChange={(v) => update('attendantSignature', v)} placeholder="Signature" className="flex-1 min-w-0" useLowerStyle />
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Address</p>
              <FormLine value={form.attendantAddress} onChange={(v) => update('attendantAddress', v)} className="w-full" useLowerStyle />
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
              <FormLine value={form.attendantName} onChange={(v) => update('attendantName', v)} useLowerStyle />
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
              <div className="flex items-center gap-1">
                <FormLine value={form.attendantDate} onChange={(v) => update('attendantDate', v)} className="flex-1 min-w-0" useLowerStyle />
                <CalendarIcon />
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p>
              <FormLine value={form.attendantTitle} onChange={(v) => update('attendantTitle', v)} useLowerStyle />
            </div>
          </div>
        </SectionStripe>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 6 ? 'active' : ''}`} id="signatures">
        <GreenRule />
        <div className="grid grid-cols-2 gap-4" style={{ fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <SectionStripe title="22. CERTIFICATION OF INFORMANT">
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>I hereby certify that all information supplied are true and correct to my own knowledge and belief.</p>
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.informantSignature} onChange={(v) => update('informantSignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.informantName} onChange={(v) => update('informantName', v)} useLowerStyle /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Relationship to the Child</p><FormLine value={form.informantRelationship} onChange={(v) => update('informantRelationship', v)} placeholder="(e.g. Mother, Father)" useLowerStyle /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Address</p><textarea value={form.informantAddress} onChange={(e) => update('informantAddress', e.target.value)} rows={2} className="w-full focus:outline-none" style={{ fontFamily: FONT_FAMILY, fontSize: '14px', backgroundColor: COLORS.white, border: `1px solid ${COLORS.borderGray}`, borderRadius: 0, padding: '4px' }} /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.informantDate} onChange={(v) => update('informantDate', v)} useLowerStyle />
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </SectionStripe>
          <SectionStripe title="23. PREPARED BY">
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.preparedBySignature} onChange={(v) => update('preparedBySignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.preparedByName} onChange={(v) => update('preparedByName', v)} useLowerStyle /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.preparedByTitle} onChange={(v) => update('preparedByTitle', v)} useLowerStyle /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.preparedByDate} onChange={(v) => update('preparedByDate', v)} useLowerStyle />
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </SectionStripe>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <SectionStripe title="24. RECEIVED BY">
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.receivedBySignature} onChange={(v) => update('receivedBySignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
                <select
                  value={form.receivedByName}
                  onChange={(e) => {
                    const chosen = RECEIVED_BY_OPTIONS.find((o) => o.name === e.target.value);
                    update('receivedByName', e.target.value);
                    update('receivedByTitle', chosen ? chosen.title : '');
                  }}
                  className="w-full min-h-[1.25rem] focus:outline-none focus:ring-0"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: '16px',
                    backgroundColor: COLORS.white,
                    border: `1px solid ${COLORS.borderGray}`,
                    borderRadius: 0,
                    padding: '2px 4px',
                    color: COLORS.black,
                  }}
                >
                  <option value="">Select name...</option>
                  {RECEIVED_BY_OPTIONS.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.receivedByTitle} onChange={(v) => update('receivedByTitle', v)} useLowerStyle /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.receivedByDate} onChange={(v) => update('receivedByDate', v)} useLowerStyle />
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </SectionStripe>
          <SectionStripe title="25. REGISTERED BY THE CIVIL REGISTRAR">
            <div className="space-y-2" style={{ fontSize: '14px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.registeredBySignature} onChange={(v) => update('registeredBySignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
                <select
                  value={form.registeredByName}
                  onChange={(e) => {
                    const chosen = RECEIVED_BY_OPTIONS.find((o) => o.name === e.target.value);
                    update('registeredByName', e.target.value);
                    update('registeredByTitle', chosen ? chosen.title : '');
                  }}
                  className="w-full min-h-[1.25rem] focus:outline-none focus:ring-0"
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: '16px',
                    backgroundColor: COLORS.white,
                    border: `1px solid ${COLORS.borderGray}`,
                    borderRadius: 0,
                    padding: '2px 4px',
                    color: COLORS.black,
                  }}
                >
                  <option value="">Select name...</option>
                  {RECEIVED_BY_OPTIONS.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p><FormLine value={form.registeredByTitle} onChange={(v) => update('registeredByTitle', v)} useLowerStyle /></div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.registeredByDate} onChange={(v) => update('registeredByDate', v)} useLowerStyle />
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </SectionStripe>
        </div>
          </div>

          <div className={`certificate-tab-panel certificate-card ${activeTabIndex === 7 ? 'active' : ''}`} id="remarks" style={{ marginTop: 0 }}>
        <div style={{ marginTop: '8px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 0 }}>
          <div style={{ backgroundColor: COLORS.sectionStripe, padding: '6px 8px', borderBottom: `1px solid ${COLORS.borderGray}` }}>
            <span style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: '15px', color: COLORS.black }}>REMARKS/ANNOTATIONS (For LCRO/OCRG Use Only)</span>
          </div>
          <textarea
            value={form.remarks}
            onChange={(e) => update('remarks', e.target.value)}
            rows={4}
            className="w-full focus:outline-none focus:ring-0 p-2"
            style={{ fontFamily: FONT_FAMILY, fontSize: '14px', backgroundColor: COLORS.white, border: 'none', borderTop: `1px solid ${COLORS.borderGray}`, borderRadius: 0, color: COLORS.black }}
          />
        </div>
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.borderGray}`, fontFamily: FONT_FAMILY, fontSize: '16px', color: COLORS.black }}>
          <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR</p>
          <div className="flex flex-wrap gap-3 items-end">
            {[8, 9, 11, 13, 15, 16, 17, 19].map((n) => (
              <span key={n} className="inline-flex flex-col items-center">
                <span style={{ fontWeight: 400, fontSize: '14px', marginBottom: '2px' }}>{n}</span>
                <span className="inline-block w-8 h-8" style={{ border: `1px solid ${COLORS.accentLightGreen}`, backgroundColor: COLORS.white, borderRadius: 0 }} />
              </span>
            ))}
          </div>
        </div>
          </div>
        </div>

        <div className="certificate-step-nav print:hidden">
          <button
            type="button"
            onClick={() => setActiveTabIndex((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-slate-500">
            Step {activeTabIndex + 1} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={() => setActiveTabIndex((i) => Math.min(totalSteps - 1, i + 1))}
            disabled={!canNext}
            className="rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600 print:hidden">Switch tabs or use Previous/Next. Changes save automatically.</p>
    </div>
  );
}



