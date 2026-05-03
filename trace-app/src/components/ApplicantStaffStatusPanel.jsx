import {
  applicantStatusBadgeClass,
  getApplicantStatusDisplay,
} from '../utils/applicantStatus';

/**
 * @param {{
 *   checklistTotal: number;
 *   checklistChecked: number;
 *   staffProcessStatus: string | null | undefined;
 *   updating?: boolean;
 *   blockStaffActions?: boolean; // unsaved wizard: complete locally but do not allow staff clicks until save
 *   onUpdateStaffStatus: (status: 'under_process' | 'verified') => void | Promise<void>;
 * }} props
 */
export function ApplicantStaffStatusPanel({
  checklistTotal,
  checklistChecked,
  staffProcessStatus,
  updating = false,
  blockStaffActions = false,
  onUpdateStaffStatus,
}) {
  const display = getApplicantStatusDisplay({
    checklist_total: checklistTotal,
    checklist_checked: checklistChecked,
    staff_process_status: staffProcessStatus,
  });
  const checklistComplete = checklistTotal > 0 && checklistChecked === checklistTotal;
  const canSetStaff = checklistComplete && !blockStaffActions;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 mb-6"
      aria-labelledby="applicant-status-heading"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="applicant-status-heading" className="text-sm font-medium text-slate-600">
          Status
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${applicantStatusBadgeClass(display.key)}`}
        >
          {display.label}
        </span>
        {canSetStaff ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={updating}
              onClick={() => onUpdateStaffStatus('under_process')}
              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-sky-800 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark UNDER PROCESS
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => onUpdateStaffStatus('verified')}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark Verified
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {blockStaffActions && checklistComplete
              ? 'Save the checklist before setting UNDER PROCESS or Verified.'
              : 'Complete every checklist item to enable UNDER PROCESS and Verified.'}
          </p>
        )}
      </div>
    </section>
  );
}
