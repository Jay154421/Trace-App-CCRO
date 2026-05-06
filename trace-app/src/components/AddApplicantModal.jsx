import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';
import { applicantInputPlaceholders, buildApplicantPayload } from '../utils/applicantForm';

const emptyForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  place_of_birth: '',
  contact_no: '',
  registrant_deceased: false,
  hilot_deceased: false,
  parent_foreigner: false,
  out_of_town: false,
  has_marriage_certificate: false,
};

export function AddApplicantModal({
  open,
  onClose,
  onAdded,
  applicationType = 'applicant',
  basePath = '/children',
}) {
  const navigate = useNavigate();
  const isColbBrap = applicationType === 'colb_brap';
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...emptyForm });
  }, [open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const base = buildApplicantPayload(form);
    const payload = {
      ...base,
      registrant_deceased: isColbBrap ? false : base.registrant_deceased,
      hilot_deceased: isColbBrap ? false : base.hilot_deceased,
      parent_foreigner: isColbBrap ? false : base.parent_foreigner,
      out_of_town: isColbBrap ? false : base.out_of_town,
      has_marriage_certificate: isColbBrap ? form.has_marriage_certificate : false,
      application_type: isColbBrap ? 'colb_brap' : 'applicant',
    };
    childrenApi
      .create(payload)
      .then((res) => {
        toast.success(isColbBrap ? 'COLB BRAP record added.' : 'Applicant added.');
        onAdded?.();
        onClose();
        navigate(`${basePath}/${res.id}`);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to save.');
      })
      .finally(() => setLoading(false));
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-applicant-modal-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 id="add-applicant-modal-title" className="text-xl font-semibold text-slate-800">
            {isColbBrap ? 'Add COLB BRAP' : 'Add applicant'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isColbBrap
              ? 'Fill out the profile for this COLB BRAP record.'
              : 'Fill out the applicant profile and apply any conditional requirements.'}
          </p>
        </div>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-6 overflow-y-auto p-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Basic details</h3>
              <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">First name *</span>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  placeholder={applicantInputPlaceholders.firstName}
                  autoComplete="given-name"
                  aria-required="true"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Middle name</span>
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={(e) => update('middle_name', e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  placeholder={applicantInputPlaceholders.middleName}
                  autoComplete="additional-name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Last name *</span>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  placeholder={applicantInputPlaceholders.lastName}
                  autoComplete="family-name"
                  aria-required="true"
                />
              </label>
            </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date of birth *</span>
                <input
                  type="date"
                  required
                  value={form.date_of_birth}
                  onChange={(e) => update('date_of_birth', e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  placeholder={applicantInputPlaceholders.dateOfBirth}
                  aria-required="true"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Contact no.</span>
                <input
                  type="text"
                  value={form.contact_no}
                  onChange={(e) => update('contact_no', e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                  placeholder={applicantInputPlaceholders.contactNo}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Place of birth</span>
              <input
                type="text"
                value={form.place_of_birth}
                onChange={(e) => update('place_of_birth', e.target.value.toUpperCase())}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                placeholder={applicantInputPlaceholders.placeOfBirth}
              />
            </label>

            {!isColbBrap ? (
              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <legend className="px-1 text-sm font-semibold text-slate-700">Conditional document requirements</legend>
                <p className="mb-4 mt-2 text-sm text-slate-500">Choose all that apply and required supporting documents will be added to the checklist.</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={form.out_of_town}
                      onChange={(e) => update('out_of_town', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Out of Town</span>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={form.registrant_deceased}
                      onChange={(e) => update('registrant_deceased', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Registrant is deceased (attach death certificate)</span>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={form.parent_foreigner}
                      onChange={(e) => update('parent_foreigner', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">One parent is foreigner (attach passport or Bureau of Immigration cert.)</span>
                  </label>
                </div>
              </fieldset>
            ) : null}
            {isColbBrap ? (
              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <legend className="px-1 text-sm font-semibold text-slate-700">COLB BRAP conditional requirement</legend>
                <p className="mb-4 mt-2 text-sm text-slate-500">Check this if the applicant has a marriage certificate.</p>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                  <input
                    type="checkbox"
                    checked={form.has_marriage_certificate}
                    onChange={(e) => update('has_marriage_certificate', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Has Marriage Certificate</span>
                </label>
              </fieldset>
            ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 sm:w-auto"
              >
                {loading ? 'Saving…' : isColbBrap ? 'Add COLB BRAP' : 'Add applicant'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
