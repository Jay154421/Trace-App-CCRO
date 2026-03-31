import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';
import { AddApplicantModal } from '../components/AddApplicantModal';

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const list = Array.isArray(data) ? data : [];
  const recentApplicants = list.slice(0, 5);

  const completedCount = list.filter((child) => {
    const total = child.checklist_total ?? 0;
    const checked = child.checklist_checked ?? 0;
    return total > 0 && checked === total;
  }).length;

  const pendingCount = list.length - completedCount;

  const stats = [
    { id: 'total', label: 'Total Applicants', value: list.length, hint: 'All recorded applicants' },
    { id: 'completed', label: 'Completed Registrations', value: completedCount, hint: 'All required documents complete' },
    { id: 'pending', label: 'Pending Registrations', value: pendingCount, hint: 'Missing or incomplete documents' },
  ];

  return (  
    <div className="space-y-6 lg:space-y-8">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 lg:text-3xl">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Overview of applicants and document requirements.
            </p>
          </div>
        </div>
      </header>

      <AddApplicantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => setListKey((k) => k + 1)}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          {error.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <section
            key={stat.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-labelledby={`stats-${stat.id}`}
          >
            <h2 id={`stats-${stat.id}`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stat.label}
            </h2>
            <p className="mt-3 text-3xl font-bold text-slate-800">
              {loading ? <span className="inline-block h-9 w-14 animate-pulse rounded-md bg-slate-200" /> : stat.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
          </section>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h2>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Add applicant
            </button>
            <Link
              to="/children"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              View all applicants
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">Use quick actions for common registration tasks.</p>
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Applicants</h2>
            <Link to="/children" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Open full list
            </Link>
          </div>

          {loading ? (
            <ul className="divide-y divide-slate-200">
              {[1, 2, 3, 4, 5].map((item) => (
                <li key={item} className="px-5 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-56 animate-pulse rounded bg-slate-100" />
                </li>
              ))}
            </ul>
          ) : recentApplicants.length > 0 ? (
            <ul className="divide-y divide-slate-200">
              {recentApplicants.map((c) => (
                <li key={c.id}>
                  <Link to={`/children/${c.id}`} className="block px-5 py-3 transition hover:bg-slate-50 focus:bg-slate-50">
                    <span className="font-medium text-slate-800">
                      {c.last_name}, {c.first_name}
                    </span>
                    <span className="ml-2 text-sm text-slate-500">
                      Age {c.age} · {c.age_group?.replace(/_/g, ' ') || '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No applicants yet</p>
              <p className="mt-1 text-sm text-slate-500">Start by adding your first applicant record.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
