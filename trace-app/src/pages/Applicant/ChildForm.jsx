import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';

function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
  }
  return Boolean(value);
}

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
  out_of_town: false,
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
          registrant_deceased: isTruthyFlag(data.registrant_deceased),
          hilot_deceased: isTruthyFlag(data.hilot_deceased),
          parent_foreigner: isTruthyFlag(data.parent_foreigner),
          out_of_town: isTruthyFlag(data.out_of_town),
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
      out_of_town: form.out_of_town,
    };
    (isEdit ? childrenApi.update(id, payload) : childrenApi.create(payload))
      .then((res) => {
        toast.success(isEdit ? 'Applicant updated.' : 'Applicant added.');
        // Ensure accurate routing and redirection (replace) to ChildDetail
        if (isEdit) {
          navigate(`/children/${id}`, { replace: true });
        } else {
          navigate(`/children/${res.id}`, { replace: true });
        }
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

      <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Applicant information</h2>
            <p className="mt-1 text-sm text-slate-500">Provide the basic details for the applicant profile.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">First name *</span>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
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
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
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
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
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
              aria-required="true"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Contact no.</span>
            <input
              type="text"
              value={form.contact_no}
              onChange={(e) => update('contact_no', e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Place of birth</span>
          <input
            type="text"
            value={form.place_of_birth}
            onChange={(e) => update('place_of_birth', e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
          />
        </label>

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

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Saving…' : isEdit ? 'Update applicant' : 'Add applicant'}
          </button>
        </div>
      </form>
    </div>
  );
}
