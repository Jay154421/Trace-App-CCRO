import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';

const empty = {
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

export function ChildForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    childrenApi
      .get(id)
      .then((data) => {
        setForm({
          first_name: data.first_name ?? '',
          middle_name: data.middle_name ?? '',
          last_name: data.last_name ?? '',
          date_of_birth: data.date_of_birth ?? '',
          place_of_birth: data.place_of_birth ?? '',
          contact_no: data.contact_no ?? '',
          registrant_deceased: Boolean(data.registrant_deceased),
          hilot_deceased: Boolean(data.hilot_deceased),
          parent_foreigner: Boolean(data.parent_foreigner),
        });
      })
      .catch((err) => setLoadError(err));
  }, [id, isEdit]);

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
    (isEdit ? childrenApi.update(id, payload) : childrenApi.create(payload))
      .then((res) => {
        toast.success(isEdit ? 'Applicant updated.' : 'Applicant added.');
        navigate(isEdit ? `/children/${id}` : `/children/${res.id}`);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to save.');
      })
      .finally(() => setLoading(false));
  };

  if (isEdit && loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        {loadError.message}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">
        {isEdit ? 'Edit applicant' : 'Add applicant'}
      </h1>

      <form onSubmit={submit} className="max-w-xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">First name *</span>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
            className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            aria-required="true"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Place of birth</span>
          <input
            type="text"
            value={form.place_of_birth}
            onChange={(e) => update('place_of_birth', e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Contact no.</span>
          <input
            type="text"
            value={form.contact_no}
            onChange={(e) => update('contact_no', e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">Registrant is deceased (attach death certificate)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.parent_foreigner}
                onChange={(e) => update('parent_foreigner', e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">One parent is foreigner (attach passport or Bureau of Immigration cert.)</span>
            </label>
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Saving…' : isEdit ? 'Update' : 'Add applicant'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
