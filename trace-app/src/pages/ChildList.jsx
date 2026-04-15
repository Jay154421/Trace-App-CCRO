import { useState, useEffect } from 'react';
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const list = data ?? [];
  const filteredList = list.filter((c) => matchApplicant(c, searchQuery));

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1536) setItemsPerPage(15);      // 2xl
      else if (width >= 1280) setItemsPerPage(12); // xl
      else if (width >= 1024) setItemsPerPage(10); // lg
      else if (width >= 768) setItemsPerPage(8);   // md
      else setItemsPerPage(6);                     // sm (mobile)
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

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
        <>
          <ul className="space-y-3">
            {paginatedList.map((c) => (
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

          {filteredList.length > itemsPerPage && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(startIndex + itemsPerPage, filteredList.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredList.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                              currentPage === page
                                ? 'bg-emerald-600 text-white z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'
                                : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
