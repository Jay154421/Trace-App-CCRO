 import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { applicantDetailPath, getApplicantBasePath } from '../../utils/applicantRoutes';
import { useQuery } from '../../hooks/useQuery';
import { childrenApi } from '../../services/api';
import { AddApplicantModal } from '../../components/AddApplicantModal';
import { formatDateDDMMYYYY } from '../../utils/date';
import { getApplicantStatusDisplay, applicantStatusBadgeClass } from '../../utils/applicantStatus';

function statusFilterPillActiveClass(value) {
  if (value === 'verified') return 'bg-emerald-600 text-white shadow-inner';
  if (value === 'under_process') return 'bg-sky-600 text-white shadow-inner';
  if (value === 'incomplete_checklist') return 'bg-amber-500 text-white shadow-inner';
  return 'bg-slate-700 text-white shadow-inner';
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDateSearchTokens(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const tokens = new Set([normalizeSearchText(raw)]);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return [...tokens].filter(Boolean);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  tokens.add(normalizeSearchText(`${year}-${month}-${day}`));
  tokens.add(normalizeSearchText(`${month}/${day}/${year}`));
  tokens.add(normalizeSearchText(`${day}/${month}/${year}`));
  tokens.add(normalizeSearchText(`${month}-${day}-${year}`));
  tokens.add(normalizeSearchText(`${day}-${month}-${year}`));
  return [...tokens].filter(Boolean);
}

function matchApplicant(c, query) {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const name = normalizeSearchText(`${c.last_name || ''} ${c.first_name || ''} ${c.middle_name || ''}`);
  const placeOfBirth = normalizeSearchText(c.place_of_birth);
  const dateTokens = getDateSearchTokens(c.date_of_birth);
  return (
    name.includes(q) ||
    placeOfBirth.includes(q) ||
    dateTokens.some((token) => token.includes(q))
  );
}

function getApplicantFullName(applicant) {
  return `${applicant.last_name}, ${applicant.first_name} ${applicant.middle_name || ''}`.trim();
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'incomplete_checklist', label: 'Incomplete Checklist' },
  { value: 'under_process', label: 'Under Process' },
  { value: 'verified', label: 'Verified' },
];

function ChildListSkeleton({ count, loadingLabel }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      <ul className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div
                className="h-11 w-11 shrink-0 rounded-lg bg-slate-200 animate-pulse"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-[min(100%,14rem)] rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-36 rounded bg-slate-200 animate-pulse" />
                <div className="pt-1 space-y-1.5">
                  <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                  <div className="h-1.5 w-full max-w-[160px] rounded-full bg-slate-200 animate-pulse" />
                </div>
              </div>
              <div
                className="h-6 w-[4.5rem] shrink-0 rounded-full bg-slate-200 animate-pulse"
                aria-hidden
              />
              <div className="h-5 w-5 shrink-0 rounded bg-slate-200 animate-pulse" aria-hidden />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChildList() {
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const listApplicationType = basePath === '/colb-brap' ? 'colb_brap' : 'applicant';
  const isColbBrapList = listApplicationType === 'colb_brap';
  const [modalOpen, setModalOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const list = data ?? [];

  const listForSection = list.filter((c) => (c.application_type || 'applicant') === listApplicationType);

  const filteredList = listForSection.filter((c) => {
    if (!matchApplicant(c, searchQuery)) return false;
    if (statusFilter === 'all') return true;
    const { key } = getApplicantStatusDisplay({
      checklist_total: c.checklist_total,
      checklist_checked: c.checklist_checked,
      staff_process_status: c.staff_process_status,
    });
    return key === statusFilter;
  });

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1536) setItemsPerPage(15);
      else if (width >= 1280) setItemsPerPage(12);
      else if (width >= 1024) setItemsPerPage(10);
      else if (width >= 768) setItemsPerPage(8);
      else setItemsPerPage(6);
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">{isColbBrapList ? 'Late Registration (BRAP)' : 'Late Registration'}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isColbBrapList ? 'Add Late Registration (BRAP)' : 'Add late registration'}
          </button>
        </div>
      </div>

      {/* ── Search + Status filter bar ── */}
      {(listForSection.length > 0 || searchQuery) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 animate-in fade-in duration-500">
          <div className="relative w-full max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              placeholder="Search by name or date of birth…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-shadow hover:shadow-sm"
              aria-label={isColbBrapList ? 'Search late registration (BRAP) records' : 'Search late registrations'}
              autoComplete="off"
            />
          </div>

          {/* Status filter pills */}
          <div
            role="group"
            aria-label="Filter by status"
            className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  statusFilter === value
                    ? statusFilterPillActiveClass(value)
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                aria-pressed={statusFilter === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <AddApplicantModal
        key={basePath}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => setListKey((k) => k + 1)}
        applicationType={listApplicationType}
        basePath={basePath}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          {error.message}
        </div>
      )}

      {loading ? (
        <ChildListSkeleton
          count={itemsPerPage}
          loadingLabel={isColbBrapList ? 'Loading late registration (BRAP) records.' : 'Loading late registrations.'}
        />
      ) : listForSection.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
          <p>{isColbBrapList ? 'No late registration (BRAP) records yet.' : 'No late registrations yet.'}</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isColbBrapList ? 'Add your first late registration (BRAP) record' : 'Add your first late registration'}
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
          <p>{isColbBrapList ? 'No late registration (BRAP) records match your filters.' : 'No late registrations match your filters.'}</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {paginatedList.map((c) => {
              const statusDisplay = getApplicantStatusDisplay({
                checklist_total: c.checklist_total,
                checklist_checked: c.checklist_checked,
                staff_process_status: c.staff_process_status,
              });
              return (
                <li key={c.id} className="flex items-center gap-3">
                  <Link
                    to={applicantDetailPath(basePath, c.id)}
                    className="group flex flex-1 items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {/* Icon */}
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

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getApplicantFullName(c)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        DOB: {formatDateDDMMYYYY(c.date_of_birth)}
                      </p>

                      {c.checklist_total != null && c.checklist_total > 0 ? (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500">
                            Documents: {c.checklist_checked ?? 0}/{c.checklist_total} complete
                          </p>
                          <div className="mt-1 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-[width]"
                              style={{
                                width: `${Math.round(
                                  ((c.checklist_checked ?? 0) / c.checklist_total) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Documents: —</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${applicantStatusBadgeClass(
                        statusDisplay.key
                      )}`}
                    >
                      {statusDisplay.label}
                    </span>

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
              );
            })}
          </ul>

          {/* ── Pagination ── */}
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
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span
                            key={page}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0"
                          >
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
