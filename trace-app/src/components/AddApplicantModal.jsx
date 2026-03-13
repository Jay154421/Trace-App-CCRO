import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';

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
};

export function AddApplicantModal({ open, onClose, onAdded }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...emptyForm });
  }, [open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || undefined,
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth,
      place_of_birth: form.place_of_birth.trim() || undefined,
      contact_no: form.contact_no.trim() || undefined,
      registrant_deceased: form.registrant_deceased,
      hilot_deceased: form.hilot_deceased,
      parent_foreigner: form.parent_foreigner,
    };
    childrenApi
      .create(payload)
      .then(() => {
        toast.success('Applicant added.');
        onAdded?.();
        onClose();
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
        className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 id="add-applicant-modal-title" className="text-xl font-semibold text-slate-800 mb-4">
            Add applicant
          </h2>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">First name *</span>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  autoComplete="given-name"
                  aria-required="true"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Middle name</span>
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={(e) => update('middle_name', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  autoComplete="additional-name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Last name *</span>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  autoComplete="family-name"
                  aria-required="true"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date of birth *</span>
              <input
                type="date"
                required
                value={form.date_of_birth}
                onChange={(e) => update('date_of_birth', e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                aria-required="true"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Place of birth</span>
              <input
                type="text"
                value={form.place_of_birth}
                onChange={(e) => update('place_of_birth', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Contact no.</span>
              <input
                type="text"
                value={form.contact_no}
                onChange={(e) => update('contact_no', e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>

            <fieldset className="rounded-lg border border-slate-200 p-4">
              <legend className="text-sm font-medium text-slate-700">Conditional document requirements</legend>
              <p className="text-xs text-slate-500 mt-1 mb-3">Check if these apply; the document checklist will include the corresponding attachments.</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.registrant_deceased}
                    onChange={(e) => update('registrant_deceased', e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Registrant is deceased (attach death certificate)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.hilot_deceased}
                    onChange={(e) => update('hilot_deceased', e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">HILOT is deceased, 5 y.o. & below (attach death certificate)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.parent_foreigner}
                    onChange={(e) => update('parent_foreigner', e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">One parent is foreigner (attach passport or Bureau of Immigration cert.)</span>
                </label>
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Add applicant'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
