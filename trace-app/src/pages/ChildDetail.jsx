import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';

const emptyEditForm = {
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

export function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  useEffect(() => {
    childrenApi
      .get(id)
      .then(setChild)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const openEditModal = () => {
    if (child) {
      setEditForm({
        first_name: child.first_name ?? '',
        middle_name: child.middle_name ?? '',
        last_name: child.last_name ?? '',
        date_of_birth: child.date_of_birth ?? '',
        place_of_birth: child.place_of_birth ?? '',
        contact_no: child.contact_no ?? '',
        registrant_deceased: Boolean(child.registrant_deceased),
        hilot_deceased: Boolean(child.hilot_deceased),
        parent_foreigner: Boolean(child.parent_foreigner),
      });
      setEditModalOpen(true);
    }
  };

  const updateEditForm = (field, value) => setEditForm((f) => ({ ...f, [field]: value }));

  const submitEdit = (e) => {
    e.preventDefault();
    setEditSaving(true);
    const payload = {
      first_name: editForm.first_name.trim(),
      middle_name: editForm.middle_name.trim() || undefined,
      last_name: editForm.last_name.trim(),
      date_of_birth: editForm.date_of_birth,
      place_of_birth: editForm.place_of_birth.trim() || undefined,
      contact_no: editForm.contact_no.trim() || undefined,
      registrant_deceased: editForm.registrant_deceased,
      hilot_deceased: editForm.hilot_deceased,
      parent_foreigner: editForm.parent_foreigner,
    };
    childrenApi
      .update(id, payload)
      .then(() => {
        return childrenApi.get(id).then(setChild);
      })
      .then(() => {
        toast.success('Applicant updated.');
        setEditModalOpen(false);
      })
      .catch((err) => toast.error(err.message || 'Failed to save.'))
      .finally(() => setEditSaving(false));
  };

  const confirmDelete = () => {
    setDeleteDeleting(true);
    childrenApi
      .remove(id)
      .then(() => {
        toast.success('Applicant removed.');
        setDeleteModalOpen(false);
        navigate('/children');
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setDeleteDeleting(false));
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  const checklistTotal = child.checklist?.length ?? 0;
  const checklistChecked = child.checklist?.filter((i) => i.checked).length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {child.last_name}, {child.first_name} {child.middle_name || ''}
        </h1>
        <div className="flex gap-2">
          <Link
            to={`/children/${id}/certificate-of-live-birth`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Certificate of Live Birth
          </Link>
          <Link
            to={`/children/${id}/documents`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Document checklist
          </Link>
          <Link
            to={`/children/${id}/field-position`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Field position
          </Link>
          <button
            type="button"
            onClick={openEditModal}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6" aria-labelledby="info-heading">
        <h2 id="info-heading" className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          Child identification
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Date of birth</dt>
            <dd className="font-medium text-slate-800">{child.date_of_birth}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Age</dt>
            <dd className="font-medium text-slate-800">{child.age} years</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Place of birth</dt>
            <dd className="font-medium text-slate-800">{child.place_of_birth || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Contact no.</dt>
            <dd className="font-medium text-slate-800">{child.contact_no || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Age group (requirements)</dt>
            <dd className="font-medium text-slate-800">{child.age_group?.replace(/_/g, ' ') || '—'}</dd>
          </div>
          <div>
              {(child.registrant_deceased || child.hilot_deceased || child.parent_foreigner) ? (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-slate-500 mb-1">Conditional requirements</dt>
                  <dd className="text-sm text-slate-700">
                    {child.registrant_deceased ? <span className="block">Death cert. (registrant)</span> : null}
                    {child.hilot_deceased && child.age <= 5 ? <span className="block">Death cert. (HILOT)</span> : null}
                    {child.parent_foreigner ? <span className="block">Passport or BI cert. (foreign parent)</span> : null}
                  </dd>
                </div>
              ) : null}
           </div>
          {child.created_at && (
            <div>
              <dt className="text-sm text-slate-500">Created date</dt>
              <dd className="font-medium text-slate-800">
                {new Date(child.created_at.split(' ')[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </dd>
            </div>
          )}
          {child.updated_at && (
            <div>
              <dt className="text-sm text-slate-500">Updated date</dt>
              <dd className="font-medium text-slate-800">
                {new Date(child.updated_at.split(' ')[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate-500 mb-1">Documents checklist</dt>
            <dd className="mt-0.5">
              {checklistTotal > 0 ? (
                <div>
                  <p className="font-medium text-slate-800">
                    {checklistChecked}/{checklistTotal} complete
                  </p>
                  <div className="mt-1.5 h-2 w-full max-w-[200px] rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{
                        width: `${checklistTotal ? Math.round((checklistChecked / checklistTotal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <Link
                    to={`/children/${id}/documents`}
                    className="inline-block mt-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    View checklist →
                  </Link>
                </div>
              ) : (
                <p className="text-slate-600">
                  — <Link to={`/children/${id}/documents`} className="text-emerald-600 hover:underline">Open document checklist</Link> to get started.
                </p>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-slate-600">
        Use the <Link to={`/children/${id}/documents`} className="text-emerald-600 hover:underline">Document checklist</Link> to see required documents for this age group and track progress.
      </p>

      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setEditModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-modal-title" className="text-lg font-semibold text-slate-800 px-5 py-4 border-b border-slate-200">
              Edit applicant
            </h2>
            <form onSubmit={submitEdit} className="flex flex-col flex-1 min-h-0">
              <div className="px-5 py-4 overflow-y-auto space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">First name *</span>
                    <input
                      type="text"
                      required
                      value={editForm.first_name}
                      onChange={(e) => updateEditForm('first_name', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Middle name</span>
                    <input
                      type="text"
                      value={editForm.middle_name}
                      onChange={(e) => updateEditForm('middle_name', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      autoComplete="additional-name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Last name *</span>
                    <input
                      type="text"
                      required
                      value={editForm.last_name}
                      onChange={(e) => updateEditForm('last_name', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      autoComplete="family-name"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Date of birth *</span>
                  <input
                    type="date"
                    required
                    value={editForm.date_of_birth}
                    onChange={(e) => updateEditForm('date_of_birth', e.target.value)}
                    className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Place of birth</span>
                  <input
                    type="text"
                    value={editForm.place_of_birth}
                    onChange={(e) => updateEditForm('place_of_birth', e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Contact no.</span>
                  <input
                    type="text"
                    value={editForm.contact_no}
                    onChange={(e) => updateEditForm('contact_no', e.target.value)}
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
                        checked={editForm.registrant_deceased}
                        onChange={(e) => updateEditForm('registrant_deceased', e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">Registrant is deceased (attach death certificate)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.parent_foreigner}
                        onChange={(e) => updateEditForm('parent_foreigner', e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">One parent is foreigner (attach passport or Bureau of Immigration cert.)</span>
                    </label>
                  </div>
                </fieldset>
              </div>
              <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
                >
                  {editSaving ? 'Saving…' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => !deleteDeleting && setDeleteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-modal-title" className="text-lg font-semibold text-slate-800">
              Delete applicant
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Delete this applicant? This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
              >
                {deleteDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
