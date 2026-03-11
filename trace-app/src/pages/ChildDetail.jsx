import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';

export function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    childrenApi
      .get(id)
      .then(setChild)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    if (!window.confirm('Delete this applicant? This cannot be undone.')) return;
    childrenApi
      .remove(id)
      .then(() => {
        toast.success('Applicant removed.');
        navigate('/children');
      })
      .catch((err) => toast.error(err.message));
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {child.last_name}, {child.first_name} {child.middle_name || ''}
        </h1>
        <div className="flex gap-2">
          <Link
            to={`/children/${id}/documents`}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Document checklist
          </Link>
          <Link
            to={`/children/${id}/edit`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
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
        </dl>
      </section>

      <p className="text-slate-600">
        Use the <Link to={`/children/${id}/documents`} className="text-sky-600 hover:underline">Document checklist</Link> to see required documents for this age group and track progress.
      </p>
    </div>
  );
}
