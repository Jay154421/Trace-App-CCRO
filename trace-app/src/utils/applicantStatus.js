/** @typedef {'incomplete_checklist' | 'under_process' | 'verified'} ApplicantStatusKey */

/**
 * @param {{ checklist_total?: number; checklist_checked?: number; staff_process_status?: string | null }} row
 */
export function isChecklistCompleteRow(row) {
  const total = row.checklist_total ?? 0;
  const checked = row.checklist_checked ?? 0;
  return total > 0 && checked === total;
}

/**
 * @param {{ checklist_total?: number; checklist_checked?: number; staff_process_status?: string | null }} row
 * @returns {{ key: ApplicantStatusKey; label: string }}
 */
export function getApplicantStatusDisplay(row) {
  if (!isChecklistCompleteRow(row)) {
    return { key: 'incomplete_checklist', label: 'Incomplete Checklist' };
  }
  const s = row.staff_process_status;
  if (s === 'verified') return { key: 'verified', label: 'Verified' };
  if (s === 'under_process') return { key: 'under_process', label: 'UNDER PROCESS' };
  return { key: 'incomplete_checklist', label: 'Incomplete Checklist' };
}

/** @param {ApplicantStatusKey} key */
export function applicantStatusBadgeClass(key) {
  switch (key) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800';
    case 'under_process':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}
