import { Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';

export function ChildList() {
  const { data: list = [], loading, error } = useQuery(childrenApi.list);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Applicants</h1>
        <Link
          to="/children/new"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          Add applicant
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          {error.message}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
          <p>No applicants yet.</p>
          <Link to="/children/new" className="mt-2 inline-block text-sky-600 hover:text-sky-700 font-medium">
            Add your first applicant
          </Link>
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-200 overflow-hidden">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                to={`/children/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 focus:bg-slate-50"
              >
                <div>
                  <span className="font-medium text-slate-800">
                    {c.last_name}, {c.first_name} {c.middle_name || ''}
                  </span>
                  <p className="text-sm text-slate-500 mt-0.5">
                    DOB: {c.date_of_birth} · Place: {c.place_of_birth || '—'} · Age {c.age}
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"
                  title="Age group"
                >
                  {c.age_group?.replace(/_/g, ' ') || '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
