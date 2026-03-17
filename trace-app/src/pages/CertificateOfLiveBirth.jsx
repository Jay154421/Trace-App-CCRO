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
  const bg = useLowerStyle ? COLORS.sectionStripe : COLORS.inputBgBeige;
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
        fontSize: '10px',
        backgroundColor: bg,
        border: useLowerStyle ? `1px solid ${COLORS.borderGray}` : 'none',
        borderBottom: useLowerStyle ? undefined : `1px solid ${borderColor}`,
        borderRadius: 0,
        padding: '2px 4px',
        color: COLORS.black,
      }}
    />
  );
}

function FormSection({ verticalLabel, children }) {
  return (
    <div className="flex gap-0 flex-wrap" style={{ borderBottom: `2px solid ${COLORS.accentGreen}` }}>
      {verticalLabel && (
        <div
          className="flex-shrink-0 flex items-center justify-center font-bold uppercase tracking-widest border-r py-2 pr-2"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            minHeight: '100px',
            borderColor: COLORS.accentGreen,
            color: COLORS.black,
            fontFamily: FONT_FAMILY,
            fontSize: '14px',
          }}
        >
          {verticalLabel}
        </div>
      )}
      <div className="flex-1 min-w-0 py-2 pl-2" style={{ borderColor: COLORS.accentGreen }}>{children}</div>
    </div>
  );
}

function SectionStripe({ title, caption, children }) {
  return (
    <div style={{ border: `1px solid ${COLORS.borderGray}`, marginBottom: 0, borderRadius: 0 }}>
      <div style={{ backgroundColor: COLORS.sectionStripe, padding: '6px 8px', borderBottom: `1px solid ${COLORS.borderGray}` }}>
        <span style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: '12px', color: COLORS.black }}>{title}</span>
        {caption && <span style={{ fontFamily: FONT_FAMILY, fontSize: '9px', color: COLORS.black, marginLeft: '6px' }}>{caption}</span>}
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
      @media print {
        @page { size: 8.5in 14in; margin: 0.25in; }
        aside[aria-label="Main navigation"] { display: none !important; }
        main[aria-label="Main content"] { flex: 1 1 100%; width: 100%; }
        body { height: 14in; overflow: hidden !important; }
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

  return (
    <div className="mx-auto" style={{ width: '8.5in', maxWidth: '100%' }}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to={`/children/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to applicant</Link>
        {saving && <span className="text-sm text-slate-500">Saving…</span>}
      </div>

      <div
        ref={certContentRef}
        className="certificate-of-live-birth-form bg-white shadow-lg p-8 print:shadow-none"
        style={{
          fontFamily: FONT_FAMILY,
          width: '8.5in',
          maxWidth: '100%',
          fontSize: '12px',
          color: COLORS.black,
          border: `2px solid ${COLORS.accentGreen}`,
          borderRadius: 0,
        }}
      >
        <header className="pb-3 mb-0" style={{ borderBottom: `2px solid ${COLORS.accentGreen}` }}>
          <div className="flex justify-between items-start gap-4 mb-2" style={{ fontSize: '11px', color: COLORS.black, fontFamily: FONT_FAMILY }}>
            <div>
              <div>Municipal Form No. 102</div>
              <div style={{ fontSize: '9px', marginTop: '2px' }}>(Revised January 2007)</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '9px' }}>(To be accomplished in quadruplicate using black ink)</div>
          </div>
          <div className="text-center" style={{ marginTop: '8px' }}>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '12px', fontWeight: 400, color: COLORS.black, margin: 0 }}>Republic of the Philippines</p>
            <p style={{ fontFamily: FONT_FAMILY, fontSize: '14px', fontWeight: 400, color: COLORS.black, margin: '2px 0' }}>OFFICE OF THE CIVIL REGISTRAR GENERAL</p>
            <h1 className="text-center font-bold uppercase text-black mt-3 pb-2" style={{ fontFamily: FONT_FAMILY, fontSize: '18px', borderBottom: `2px solid ${COLORS.accentGreen}`, marginBottom: 0 }}>CERTIFICATE OF LIVE BIRTH</h1>
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.accentGreen}`, paddingTop: '8px', fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.black }}>
            <div className="flex gap-4">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="mb-1">Province</span>
                <FormLine value={form.province} onChange={(v) => update('province', v)} />
                <span className="block mb-1 mt-2">City/Municipality</span>
                <FormLine value={form.cityMunicipality} onChange={(v) => update('cityMunicipality', v)} />
              </div>
              <div className="flex flex-col shrink-0" style={{ minWidth: '140px' }}>
                <span className="mb-1">Registry No.</span>
                <FormLine value={form.registryNo} onChange={(v) => update('registryNo', v)} className="w-full" width="w-full" />
              </div>
            </div>
          </div>
        </header>

        <GreenRule />

        <FormSection verticalLabel="CHILD">
          <div className="space-y-2.5" style={{ fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.black }}>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>1. NAME</p>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.childFirst} onChange={(v) => update('childFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.childMiddle} onChange={(v) => update('childMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.childLast} onChange={(v) => update('childLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>2. SEX (Male/Female)</p>
              <div className="flex items-center gap-1">
                <FormLine value={form.sex} onChange={(v) => update('sex', v)} className="w-28" width="w-28" />
                <DropdownArrowIcon />
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>3. DATE OF BIRTH</p>
              <div className="flex flex-wrap gap-2 items-center">
                <FormLine value={form.birthDay} onChange={(v) => update('birthDay', v)} placeholder="(Day)" className="w-14" width="w-14" />
                <FormLine value={form.birthMonth} onChange={(v) => update('birthMonth', v)} placeholder="(Month)" className="w-20" width="w-20" />
                <FormLine value={form.birthYear} onChange={(v) => update('birthYear', v)} placeholder="(Year)" className="w-20" width="w-20" />
                <CalendarIcon />
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>4. PLACE OF BIRTH</p>
              <div className="space-y-1">
                <FormLine value={form.placeOfBirthName} onChange={(v) => update('placeOfBirthName', v)} placeholder="(Name of Hospital/Clinic/Institution/House No., St., Barangay)" />
                <div className="flex gap-4">
                  <FormLine value={form.placeOfBirthCity} onChange={(v) => update('placeOfBirthCity', v)} placeholder="(City/Municipality)" className="flex-1" />
                  <FormLine value={form.placeOfBirthProvince} onChange={(v) => update('placeOfBirthProvince', v)} placeholder="(Province)" className="flex-1" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>5a. TYPE OF BIRTH</p>
                <FormLine value={form.typeOfBirth} onChange={(v) => update('typeOfBirth', v)} placeholder="(Single, Twin, Triplet, etc.)" className="w-48" width="w-48" />
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>5b. IF MULTIPLE BIRTH, CHILD WAS</p>
                <FormLine value={form.multipleBirthOrder} onChange={(v) => update('multipleBirthOrder', v)} placeholder="(First, Second, Third, etc.)" className="w-48" width="w-48" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>5c. BIRTH ORDER</p>
                <p className="mb-0.5" style={{ fontSize: '9px', fontWeight: 400 }}>(Order of this birth to previous live births including fetal death)</p>
                <FormLine value={form.birthOrder} onChange={(v) => update('birthOrder', v)} placeholder="(First, Second, Third, etc.)" className="w-full" />
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>6. WEIGHT AT BIRTH</p>
              <div className="flex items-baseline gap-2">
                <FormLine value={form.weightGrams} onChange={(v) => update('weightGrams', v)} className="w-24" width="w-24" />
                <span>grams</span>
              </div>
            </div>
          </div>
        </FormSection>

        <GreenRule />

        <FormSection verticalLabel="MOTHER">
          <div className="space-y-2.5" style={{ fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.black }}>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>7. MAIDEN NAME</p>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.motherFirst} onChange={(v) => update('motherFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.motherMiddle} onChange={(v) => update('motherMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.motherLast} onChange={(v) => update('motherLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex-1 min-w-[100px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>8. CITIZENSHIP</p>
                <FormLine value={form.motherCitizenship} onChange={(v) => update('motherCitizenship', v)} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>9. RELIGION/RELIGIOUS SECT</p>
                <FormLine value={form.motherReligion} onChange={(v) => update('motherReligion', v)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">  
              <div className="flex-1 min-w-[80px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>10a. Total number of children born alive</p>
                <FormLine value={form.motherChildrenBornAlive} onChange={(v) => update('motherChildrenBornAlive', v)} />
              </div>
              <div className="flex-1 min-w-[80px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>10b. No. of children still living including this birth</p>
                <FormLine value={form.motherChildrenLiving} onChange={(v) => update('motherChildrenLiving', v)} />
              </div>
              <div className="flex-1 min-w-[80px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>10c. No. of children born alive but are now dead</p>
                <FormLine value={form.motherChildrenDead} onChange={(v) => update('motherChildrenDead', v)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex-1 min-w-[100px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>11. OCCUPATION</p>
                <FormLine value={form.motherOccupation} onChange={(v) => update('motherOccupation', v)} />
              </div>
              <div className="flex-shrink-0">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>12. AGE at the time of this birth (completed years)</p>
                <div className="flex items-baseline gap-1">
                  <FormLine value={form.motherAge} onChange={(v) => update('motherAge', v)} className="w-14" width="w-14" />
                  <span style={{ fontSize: '10px', marginLeft: '2px' }}>#</span>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>13. RESIDENCE</p>
              <div className="space-y-1">
                <FormLine value={form.motherResidenceLine1} onChange={(v) => update('motherResidenceLine1', v)} placeholder="(House No., St., Barangay)" />
                <div className="flex gap-4 flex-wrap">
                  <FormLine value={form.motherResidenceCity} onChange={(v) => update('motherResidenceCity', v)} placeholder="(City/Municipality)" className="flex-1 min-w-[100px]" />
                  <FormLine value={form.motherResidenceProvince} onChange={(v) => update('motherResidenceProvince', v)} placeholder="(Province)" className="flex-1 min-w-[100px]" />
                  <FormLine value={form.motherResidenceCountry} onChange={(v) => update('motherResidenceCountry', v)} placeholder="(Country)" className="flex-1 min-w-[100px]" />
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        <GreenRule />

        <FormSection verticalLabel="FATHER">
          <div className="space-y-2.5" style={{ fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.black }}>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>14. NAME</p>
              <div className="flex flex-wrap gap-2 items-baseline">
                <FormLine value={form.fatherFirst} onChange={(v) => update('fatherFirst', v)} placeholder="(First)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.fatherMiddle} onChange={(v) => update('fatherMiddle', v)} placeholder="(Middle)" className="flex-1 min-w-[80px]" />
                <FormLine value={form.fatherLast} onChange={(v) => update('fatherLast', v)} placeholder="(Last)" className="flex-1 min-w-[80px]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex-1 min-w-[100px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>15. CITIZENSHIP</p>
                <FormLine value={form.fatherCitizenship} onChange={(v) => update('fatherCitizenship', v)} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>16. RELIGION/RELIGIOUS SECT</p>
                <FormLine value={form.fatherReligion} onChange={(v) => update('fatherReligion', v)} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>17. OCCUPATION</p>
                <FormLine value={form.fatherOccupation} onChange={(v) => update('fatherOccupation', v)} />
              </div>
              <div className="flex-shrink-0">
                <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>18. AGE at the time of this birth (completed years)</p>
                <div className="flex items-baseline gap-1">
                  <FormLine value={form.fatherAge} onChange={(v) => update('fatherAge', v)} className="w-14" width="w-14" />
                  <span style={{ fontSize: '10px', marginLeft: '2px' }}>#</span>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1" style={{ fontWeight: 400, fontSize: '11px' }}>19. RESIDENCE</p>
              <div className="space-y-1">
                <FormLine value={form.fatherResidenceLine1} onChange={(v) => update('fatherResidenceLine1', v)} placeholder="(House No., St., Barangay)" />
                <div className="flex gap-4 flex-wrap">
                  <FormLine value={form.fatherResidenceCity} onChange={(v) => update('fatherResidenceCity', v)} placeholder="(City/Municipality)" className="flex-1 min-w-[100px]" />
                  <FormLine value={form.fatherResidenceProvince} onChange={(v) => update('fatherResidenceProvince', v)} placeholder="(Province)" className="flex-1 min-w-[100px]" />
                  <FormLine value={form.fatherResidenceCountry} onChange={(v) => update('fatherResidenceCountry', v)} placeholder="(Country)" className="flex-1 min-w-[100px]" />
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        <GreenRule />
        <div style={{ fontFamily: FONT_FAMILY, color: COLORS.black, marginTop: '8px' }}>
          <p style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>MARRIAGE OF PARENTS</p>
          <p style={{ fontSize: '9px', fontWeight: 400, marginBottom: '6px' }}>(If not married, accomplish Affidavit of Acknowledgement/Admission of Paternity at the back.)</p>
          <div style={{ height: 2, backgroundColor: COLORS.accentLightGreen, marginBottom: '8px', borderRadius: 0 }} />
          <div className="flex flex-wrap gap-x-6 gap-y-2" style={{ fontSize: '11px' }}>
            <div>
              <p className="mb-1" style={{ fontWeight: 400 }}>20a. DATE</p>
              <div className="flex flex-wrap gap-2 items-center">
                <FormLine value={form.marriageMonth} onChange={(v) => update('marriageMonth', v)} placeholder="(Month)" className="w-20" width="w-20" useLowerStyle />
                <FormLine value={form.marriageDay} onChange={(v) => update('marriageDay', v)} placeholder="(Day)" className="w-14" width="w-14" useLowerStyle />
                <FormLine value={form.marriageYear} onChange={(v) => update('marriageYear', v)} placeholder="(Year)" className="w-20" width="w-20" useLowerStyle />
                <CalendarIcon />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="mb-1" style={{ fontWeight: 400 }}>20b. PLACE</p>
              <div className="flex gap-2 flex-wrap">
                <FormLine value={form.marriagePlace} onChange={(v) => update('marriagePlace', v)} placeholder="(City / Municipality, Province, Country)" className="flex-1 min-w-[80px]" useLowerStyle />
              </div>
            </div>
          </div>
        </div>

        <GreenRule />

        <SectionStripe title="21a. ATTENDANT">
          <div className="flex flex-wrap gap-4 items-center" style={{ fontFamily: FONT_FAMILY, fontSize: '10px', color: COLORS.black }}>
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
          <p style={{ fontFamily: FONT_FAMILY, fontSize: '10px', color: COLORS.black, marginBottom: '8px' }}>
            I hereby certify that I attended the birth of the child who was born alive at
            <span className="inline-flex items-baseline gap-1 mx-1 align-middle">
              <FormLine value={form.attendantTime} onChange={(v) => update('attendantTime', v)} placeholder="_ _ : _ _" className="w-16" width="w-16" useLowerStyle />
              <select value={form.attendantAmpm} onChange={(e) => update('attendantAmpm', e.target.value)} style={{ fontFamily: FONT_FAMILY, fontSize: '10px', backgroundColor: COLORS.sectionStripe, border: `1px solid ${COLORS.borderGray}`, borderRadius: 0, padding: '2px 4px', color: COLORS.black }}>
                <option value="am">am</option>
                <option value="pm">pm</option>
              </select>
            </span>
            on the date of birth specified above.
          </p>
          <div className="flex gap-x-8 gap-y-2 flex-wrap" style={{ fontSize: '10px' }}>
            <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.attendantSignature} onChange={(v) => update('attendantSignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p>
                <FormLine value={form.attendantName} onChange={(v) => update('attendantName', v)} useLowerStyle />
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Title or Position</p>
                <FormLine value={form.attendantTitle} onChange={(v) => update('attendantTitle', v)} useLowerStyle />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Address</p>
                <FormLine value={form.attendantAddress} onChange={(v) => update('attendantAddress', v)} className="w-full" useLowerStyle />
              </div>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Date</p>
                <div className="flex items-center gap-1">
                  <FormLine value={form.attendantDate} onChange={(v) => update('attendantDate', v)} useLowerStyle />
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </div>
        </SectionStripe>

        <GreenRule />

        <div className="grid grid-cols-2 gap-4" style={{ fontFamily: FONT_FAMILY, color: COLORS.black }}>
          <SectionStripe title="22. CERTIFICATION OF INFORMANT">
            <p style={{ fontSize: '10px', marginBottom: '8px' }}>I hereby certify that all information supplied are true and correct to my own knowledge and belief.</p>
            <div className="space-y-2" style={{ fontSize: '10px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.informantSignature} onChange={(v) => update('informantSignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.informantName} onChange={(v) => update('informantName', v)} useLowerStyle /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Relationship to the Child</p><FormLine value={form.informantRelationship} onChange={(v) => update('informantRelationship', v)} placeholder="(e.g. Mother, Father)" useLowerStyle /></div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Address</p><textarea value={form.informantAddress} onChange={(e) => update('informantAddress', e.target.value)} rows={2} className="w-full focus:outline-none" style={{ fontFamily: FONT_FAMILY, fontSize: '10px', backgroundColor: COLORS.sectionStripe, border: `1px solid ${COLORS.borderGray}`, borderRadius: 0, padding: '4px' }} /></div>
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
            <div className="space-y-2" style={{ fontSize: '10px' }}>
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
            <div className="space-y-2" style={{ fontSize: '10px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.receivedBySignature} onChange={(v) => update('receivedBySignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.receivedByName} onChange={(v) => update('receivedByName', v)} useLowerStyle /></div>
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
            <div className="space-y-2" style={{ fontSize: '10px' }}>
              <div>
                <p className="mb-1" style={{ fontWeight: 400 }}>Signature</p>
                <div className="flex items-center gap-1">
                  <QuillIcon />
                  <FormLine value={form.registeredBySignature} onChange={(v) => update('registeredBySignature', v)} placeholder="Signature" className="flex-1" useLowerStyle />
                </div>
              </div>
              <div><p className="mb-1" style={{ fontWeight: 400 }}>Name in Print</p><FormLine value={form.registeredByName} onChange={(v) => update('registeredByName', v)} useLowerStyle /></div>
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

        <div style={{ marginTop: '8px', border: `1px solid ${COLORS.borderGray}`, borderRadius: 0 }}>
          <div style={{ backgroundColor: COLORS.sectionStripe, padding: '6px 8px', borderBottom: `1px solid ${COLORS.borderGray}` }}>
            <span style={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: '12px', color: COLORS.black }}>REMARKS/ANNOTATIONS (For LCRO/OCRG Use Only)</span>
          </div>
          <textarea
            value={form.remarks}
            onChange={(e) => update('remarks', e.target.value)}
            rows={4}
            className="w-full focus:outline-none focus:ring-0 p-2"
            style={{ fontFamily: FONT_FAMILY, fontSize: '10px', backgroundColor: COLORS.sectionStripe, border: 'none', borderTop: `1px solid ${COLORS.borderGray}`, borderRadius: 0, color: COLORS.black }}
          />
        </div>

        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.borderGray}`, fontFamily: FONT_FAMILY, fontSize: '11px', color: COLORS.black }}>
          <p style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px' }}>TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR</p>
          <div className="flex flex-wrap gap-3 items-end">
            {[8, 9, 11, 13, 15, 16, 17, 19].map((n) => (
              <span key={n} className="inline-flex flex-col items-center">
                <span style={{ fontWeight: 400, fontSize: '10px', marginBottom: '2px' }}>{n}</span>
                <span className="inline-block w-8 h-8" style={{ border: `1px solid ${COLORS.accentLightGreen}`, backgroundColor: COLORS.white, borderRadius: 0 }} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600 print:hidden">Applicant: {child.first_name} {child.last_name}. Edit any field; changes save automatically.</p>
    </div>
  );
}



