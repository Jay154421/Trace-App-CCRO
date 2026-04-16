import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';
import { AddApplicantModal } from '../components/AddApplicantModal';
import { formatDateDDMMYYYY } from '../utils/date';
import toast from 'react-hot-toast';

/** Derive a simple "Complete" / "Pending" status from checklist progress. */
function isComplete(c) {
  const total = c.checklist_total ?? 0;
  const checked = c.checklist_checked ?? 0;
  return total > 0 && checked === total;
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
  { value: 'pending', label: 'Pending' },
  { value: 'complete', label: 'Complete' },
];

export function ChildList() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Multi-select / bulk-delete state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const list = data ?? [];

  const filteredList = list.filter((c) => {
    if (!matchApplicant(c, searchQuery)) return false;
    if (statusFilter === 'complete') return isComplete(c);
    if (statusFilter === 'pending') return !isComplete(c);
    return true;
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

  // Clear selection when exiting select mode
  useEffect(() => {
    if (!selectMode) setSelectedIds(new Set());
  }, [selectMode]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const visibleIds = paginatedList.map((c) => c.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleItem(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  // ── Bulk delete ──────────────────────────────────────────────────────────────
  function openDeleteConfirmModal() {
    if (selectedIds.size === 0) return;
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirmModal() {
    if (bulkDeleting) return;
    setDeleteConfirmOpen(false);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await childrenApi.bulkRemove([...selectedIds]);
      toast.success(
        `${selectedIds.size} applicant${selectedIds.size > 1 ? 's' : ''} deleted.`
      );
      setDeleteConfirmOpen(false);
      setListKey((k) => k + 1);
      setSelectMode(false);
    } catch (err) {
      toast.error(err?.message || 'Bulk delete failed.');
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Applicants</h1>
        <div className="flex items-center gap-2">
          {/* Bulk-delete toolbar */}
          {selectMode ? (
            <>
              <span className="text-sm text-slate-500">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={openDeleteConfirmModal}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete selected'}
              </button>
              <button
                type="button"
                onClick={() => setSelectMode(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {list.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Select
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Add applicant
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Search + Status filter bar ── */}
      {(list.length > 0 || searchQuery) && (
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
              aria-label="Search applicants"
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
                    ? value === 'complete'
                      ? 'bg-emerald-600 text-white shadow-inner'
                      : value === 'pending'
                      ? 'bg-amber-500 text-white shadow-inner'
                      : 'bg-slate-700 text-white shadow-inner'
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => setListKey((k) => k + 1)}
      />

      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-applicants-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteConfirmModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-applicants-modal-title" className="text-lg font-semibold text-slate-800">
              Delete {selectedIds.size} applicant{selectedIds.size > 1 ? 's' : ''}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirmModal}
                disabled={bulkDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <p>No applicants match your filters.</p>
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
          {/* Select-all row (only in select mode) */}
          {selectMode && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
              <input
                id="select-all-checkbox"
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                aria-label="Select all on this page"
              />
              <label
                htmlFor="select-all-checkbox"
                className="text-sm text-slate-600 cursor-pointer select-none"
              >
                {allVisibleSelected ? 'Deselect all on this page' : 'Select all on this page'}
              </label>
            </div>
          )}

          <ul className="space-y-3">
            {paginatedList.map((c) => {
              const complete = isComplete(c);
              const isSelected = selectedIds.has(c.id);

              return (
                <li key={c.id} className="flex items-center gap-3">
                  {/* Checkbox (visible only in select mode) */}
                  {selectMode && (
                    <input
                      type="checkbox"
                      id={`select-${c.id}`}
                      checked={isSelected}
                      onChange={() => toggleItem(c.id)}
                      aria-label={`Select ${getApplicantFullName(c)}`}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  )}

                  {/* Card */}
                  <Link
                    to={`/children/${c.id}`}
                    onClick={(e) => {
                      // In select mode, clicking the card toggles selection instead
                      if (selectMode) {
                        e.preventDefault();
                        toggleItem(c.id);
                      }
                    }}
                    className={`group flex flex-1 items-center gap-4 rounded-xl border bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isSelected
                        ? 'border-emerald-400 ring-1 ring-emerald-300'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
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
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        complete
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {complete ? 'Complete' : 'Pending'}
                    </span>

                    {/* Chevron (hidden in select mode) */}
                    {!selectMode && (
                      <span className="shrink-0 text-slate-400 transition group-hover:text-emerald-600" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                          <path
                            fillRule="evenodd"
                            d="M7.22 4.97a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L11.19 10 7.22 6.03a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
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
