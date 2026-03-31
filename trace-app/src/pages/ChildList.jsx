import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';
import { AddApplicantModal } from '../components/AddApplicantModal';
import { formatDateDDMMYYYY } from '../utils/date';

function matchApplicant(c, query) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const name = `${c.last_name} ${c.first_name} ${c.middle_name || ''}`.toLowerCase();
  const dob = (c.date_of_birth || '').toLowerCase();
  return name.includes(q) || dob.includes(q);
}

function getApplicantFullName(applicant) {
  return `${applicant.last_name}, ${applicant.first_name} ${applicant.middle_name || ''}`.trim();
}

export function ChildList() {
  const [modalOpen, setModalOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const list = data ?? [];
  const filteredList = list.filter((c) => matchApplicant(c, searchQuery));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Applicants</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Add applicant
        </button>
      </div>

      {list.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by name or date of birth…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            aria-label="Search applicants"
          />
        </div>
      )}

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

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
          <p>No applicants yet.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Add your first applicant
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
          <p>No applicants match your search.</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredList.map((c) => (
            <li key={c.id}>
              <Link
                to={`/children/${c.id}`}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-amber-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path d="M19.5 5.25h-7.379a2.25 2.25 0 0 1-1.591-.659l-.621-.621a2.25 2.25 0 0 0-1.591-.659H4.5A2.25 2.25 0 0 0 2.25 5.56v12.19A2.25 2.25 0 0 0 4.5 20h15a2.25 2.25 0 0 0 2.25-2.25V7.5a2.25 2.25 0 0 0-2.25-2.25Z" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{getApplicantFullName(c)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">DOB: {formatDateDDMMYYYY(c.date_of_birth)}</p>
                  {c.checklist_total != null && c.checklist_total > 0 ? (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500">
                        Documents: {c.checklist_checked ?? 0}/{c.checklist_total} complete
                      </p>
                      <div className="mt-1 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width]"
                          style={{ width: `${Math.round(((c.checklist_checked ?? 0) / c.checklist_total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Documents: —</p>
                  )}
                </div>

                <span className="shrink-0 text-slate-400 transition group-hover:text-emerald-600" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path
                      fillRule="evenodd"
                      d="M7.22 4.97a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L11.19 10 7.22 6.03a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
