import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getApplicantBasePath } from '../../utils/applicantRoutes';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';
import { ApplicantFormFields } from '../../components/applicant/ApplicantFormFields';
import { emptyApplicantForm, mapApplicantToForm, buildApplicantPayload } from '../../utils/applicantForm';

export function ChildForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const isColbBrapSection = basePath === '/colb-brap';
  const isEdit = Boolean(id) && /^\d+$/.test(String(id));
  const [form, setForm] = useState(emptyApplicantForm);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    childrenApi
      .get(id)
      .then((data) => setForm(mapApplicantToForm(data)))
      .catch((err) => setLoadError(err));
  }, [id, isEdit]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = buildApplicantPayload(form);
    if (!isEdit) {
      payload.application_type = isColbBrapSection ? 'colb_brap' : 'applicant';
    }
    (isEdit ? childrenApi.update(id, payload) : childrenApi.create(payload))
      .then((res) => {
        toast.success(
          isEdit
            ? isColbBrapSection
              ? 'COLB Brap record updated.'
              : 'Applicant updated.'
            : isColbBrapSection
              ? 'COLB Brap record added.'
              : 'Applicant added.'
        );
        if (isEdit) {
          navigate(`${basePath}/${id}`, { replace: true });
        } else {
          navigate(`${basePath}/${res.id}`, { replace: true });
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
        {isEdit
          ? isColbBrapSection
            ? 'Edit COLB Brap'
            : 'Edit applicant'
          : isColbBrapSection
            ? 'Add COLB Brap'
            : 'Add applicant'}
      </h1>

      <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ApplicantFormFields
          form={form}
          onFieldChange={update}
          hideCoreIdentityFields={isEdit}
          hideConditionalRequirements={isColbBrapSection}
        />

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
            {loading
              ? 'Saving…'
              : isEdit
                ? isColbBrapSection
                  ? 'Update COLB Brap'
                  : 'Update applicant'
                : isColbBrapSection
                  ? 'Add COLB Brap'
                  : 'Add applicant'}
          </button>
        </div>
      </form>
    </div>
  );
}
