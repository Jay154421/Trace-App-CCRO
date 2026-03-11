import { Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';

export function Dashboard() {
  const { data, loading, error } = useQuery(childrenApi.list);
  const list = Array.isArray(data) ? data : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Dashboard</h1>
      <p className="text-slate-600 mb-6">Overview of applicants and document requirements.</p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          {error.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <section
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          aria-labelledby="stats-total"
        >
          <h2 id="stats-total" className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Total Applicants
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-800">{loading ? '…' : list.length}</p>
        </section>
        <section
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          aria-labelledby="stats-cta"
        >
          <h2 id="stats-cta" className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Quick action
          </h2>
          <Link
            to="/children/new"
            className="mt-2 inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Add applicant
          </Link>
        </section>
      </div>

      {list.length > 0 && (
        <section className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="sr-only">Recent applicants</h2>
          <ul className="divide-y divide-slate-200">
            {list.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  to={`/children/${c.id}`}
                  className="block px-5 py-3 hover:bg-slate-50 focus:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">
                    {c.last_name}, {c.first_name}
                  </span>
                  <span className="text-slate-500 text-sm ml-2">
                    Age {c.age} · {c.age_group?.replace(/_/g, ' ') || '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
            <Link to="/children" className="text-sm font-medium text-sky-600 hover:text-sky-700">
              View all applicants →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
