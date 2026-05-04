import { useParams, Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

function FormLine({ value = '', onChange, placeholder, width = 'flex-1', className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`focus:outline-none border-b border-green-600 bg-transparent px-1 py-0.5 text-black ${width} ${className}`}
      style={{ fontFamily: FONT_FAMILY, fontSize: '15px' }}
    />
  );
}

export function PaternityAffidavit() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [loading, setLoading] = useState(true);
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
        setForm(prev => ({ ...prev, ...stored }));
      })
      .catch(() => toast.error('Failed to load child data'))
      .finally(() => setLoading(false));
  }, [id]);

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
            <FormLine value={form.motherName} onChange={v => update('motherName', v)} placeholder="(Mother's name)" width="w-64" />
            <span>and</span>
            <FormLine value={form.fatherName} onChange={v => update('fatherName', v)} placeholder="(Father's name)" width="w-64" />
            <span>,</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>of legal age, am/are the natural mother and/or father of</span>
            <FormLine value={form.childName} onChange={v => update('childName', v)} placeholder="(Child's name)" width="w-80" />
            <span>, who was</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <span>born on</span>
            <FormLine value={form.dob} onChange={v => update('dob', v)} placeholder="(Date of birth)" width="w-48" />
            <span>at</span>
            <FormLine value={form.pob} onChange={v => update('pob', v)} placeholder="(Place of birth)" width="flex-1" />
            <span>.</span>
          </div>

          <p className="mt-8">
            I am / We are executing this affidavit to attest to the truthfulness of the foregoing statements and for purposes of acknowledging my/our child.
          </p>

          <div className="grid grid-cols-2 gap-12 mt-12 pt-8">
            <div className="text-center">
              <div className="border-b border-green-600 h-8 mb-1"></div>
              <p className="text-xs">(Signature Over Printed Name of Father)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-green-600 h-8 mb-1"></div>
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
              <FormLine value={form.swornBy1} onChange={v => update('swornBy1', v)} placeholder="(Name)" width="w-64" />
              <span>and</span>
              <FormLine value={form.swornBy2} onChange={v => update('swornBy2', v)} placeholder="(Name)" width="w-64" />
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