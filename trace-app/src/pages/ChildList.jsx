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
        <ul className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-200 overflow-hidden">
          {filteredList.map((c) => (
            <li key={c.id}>
              <Link
                to={`/children/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 focus:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">
                    {c.last_name}, {c.first_name} {c.middle_name || ''}
                  </span>
                  <p className="text-sm text-slate-500 mt-0.5">
                    DOB: {formatDateDDMMYYYY(c.date_of_birth)}
                  </p>
                  {c.checklist_total != null && c.checklist_total > 0 ? (
                    <div className="mt-1.5">
                      <p className="text-xs text-slate-500">
                        Documents: {c.checklist_checked ?? 0}/{c.checklist_total} complete
                      </p>
                      <div className="mt-1 h-1.5 w-full max-w-[120px] rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width]"
                          style={{ width: `${Math.round(((c.checklist_checked ?? 0) / c.checklist_total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Documents: —</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
