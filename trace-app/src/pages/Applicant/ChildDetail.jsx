import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  applicantDocumentsPath,
  applicantPathAfterId,
  getApplicantBasePath,
  getApplicantBasePathForRecord,
} from '../../utils/applicantRoutes';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../../services/api';
import { formatDateDDMMYYYY } from '../../utils/date';
import { buildFieldPositionPdfBase64, buildMergedCertData, buildPdfFilename } from '../../utils/pdfUtils';
import {
  buildFieldPositionPdfBase64 as buildFieldPositionBackPdfBase64,
  buildMergedCertData as buildMergedBackCertData,
  buildPdfFilename as buildBackPdfFilename,
} from '../utils/FieldPositionBack';
import { ApplicantFormFields } from '../../components/applicant/ApplicantFormFields';
import { ApplicantStaffStatusPanel } from '../../components/ApplicantStaffStatusPanel';
import {
  emptyApplicantForm,
  mapApplicantToForm,
  buildApplicantPayload,
  isTruthyFlag,
  formatApplicantGenderLabel,
} from '../../utils/applicantForm';

export function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getApplicantBasePath(location.pathname);
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyApplicantForm);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [staffStatusUpdating, setStaffStatusUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    childrenApi
      .get(id)
      .then((data) => {
        if (!cancelled) setChild(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, location.key]);

  useEffect(() => {
    if (!child || !id) return;
    const recordBase = getApplicantBasePathForRecord(child.application_type);
    if (recordBase !== basePath) {
      navigate(`${recordBase}/${id}${applicantPathAfterId(location.pathname)}`, { replace: true });
    }
  }, [child, id, basePath, location.pathname, navigate]);

  const openEditModal = () => {
    if (child) {
      setEditForm(mapApplicantToForm(child));
      setEditModalOpen(true);
    }
  };

  const updateEditForm = (field, value) => setEditForm((f) => ({ ...f, [field]: value }));

  const submitEdit = (e) => {
    e.preventDefault();
    setEditSaving(true);
    const payload = buildApplicantPayload(editForm);
    childrenApi
      .update(id, payload)
      .then(() => {
        return childrenApi.get(id).then(setChild);
      })
      .then(() => {
        const colb = String(child?.application_type || '').toLowerCase() === 'colb_brap';
        toast.success(colb ? 'COLB BRAP record updated.' : 'Applicant updated.');
        setEditModalOpen(false);
      })
      .catch((err) => toast.error(err.message || 'Failed to save.'))
      .finally(() => setEditSaving(false));
  };

  const handleStaffProcessStatus = async (status) => {
    setStaffStatusUpdating(true);
    try {
      await childrenApi.updateStaffProcessStatus(id, status);
      toast.success(status === 'verified' ? 'Marked verified.' : 'Marked under process.');
      const data = await childrenApi.get(id);
      setChild(data);
    } catch (err) {
      toast.error(err?.message || 'Could not update status.');
    } finally {
      setStaffStatusUpdating(false);
    }
  };

  const confirmDelete = () => {
    const childId = Number(id);
    if (!Number.isInteger(childId) || childId < 1) {
      toast.error('Invalid applicant id.');
      return;
    }
    setDeleteDeleting(true);
    childrenApi
      .remove(childId)
      .then(() => {
        const colb = String(child?.application_type || '').toLowerCase() === 'colb_brap';
        toast.success(colb ? 'COLB BRAP record removed.' : 'Applicant removed.');
        setDeleteModalOpen(false);
        navigate(basePath);
      })
      .catch((err) => toast.error(err?.message || 'Could not delete applicant.'))
      .finally(() => setDeleteDeleting(false));
  };

  const handleSavePdf = useCallback(async () => {
    const checklist = child?.checklist ?? [];
    const checklistTotal = checklist.length;
    const checklistChecked = checklist.filter((item) => item.checked).length;
    const isChecklistComplete = checklistTotal > 0 && checklistChecked === checklistTotal;

    if (!isChecklistComplete) {
      toast.error('Complete the document checklist before saving PDF.');
      return;
    }

    if (!window.electron?.saveFieldPositionPdf) return;
    try {
      const cert = child?.certificate_of_live_birth && typeof child.certificate_of_live_birth === 'object'
        ? child.certificate_of_live_birth
        : {};
      const merged = buildMergedCertData(child, cert);
      const base64 = buildFieldPositionPdfBase64(merged);
      const suggestedFilename = buildPdfFilename(child, cert);
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (result?.ok) {
        toast.success('PDF saved.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save PDF.');
    }
  }, [child]);

  const handleSavePdfBack = useCallback(async () => {
    const checklist = child?.checklist ?? [];
    const checklistTotal = checklist.length;
    const checklistChecked = checklist.filter((item) => item.checked).length;
    const isChecklistComplete = checklistTotal > 0 && checklistChecked === checklistTotal;

    if (!isChecklistComplete) {
      toast.error('Complete the document checklist before saving PDF.');
      return;
    }

    if (!window.electron?.saveFieldPositionPdf) return;
    try {
      const cert = child?.certificate_of_live_birth && typeof child.certificate_of_live_birth === 'object'
        ? child.certificate_of_live_birth
        : {};
      const merged = buildMergedBackCertData(child, cert);
      const base64 = buildFieldPositionBackPdfBase64(merged);
      const suggestedFilename = `BACK-${buildBackPdfFilename(child, cert)}`;
      const result = await window.electron.saveFieldPositionPdf(base64, suggestedFilename);
      if (result?.ok) {
        toast.success('Back PDF saved.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save back PDF.');
    }
  }, [child]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  const checklistTotal = child.checklist?.length ?? 0;
  const checklistChecked = child.checklist?.filter((i) => i.checked).length ?? 0;
  const isChecklistComplete = checklistTotal > 0 && checklistChecked === checklistTotal;
  const hasRegistrantDeceased = isTruthyFlag(child.registrant_deceased);
  const hasHilotDeceased = isTruthyFlag(child.hilot_deceased);
  const hasParentForeigner = isTruthyFlag(child.parent_foreigner);
  const hasOutOfTown = isTruthyFlag(child.out_of_town);
  const hasMarriageCertificate = isTruthyFlag(child.has_marriage_certificate);
  const colbRequiresParentId = isTruthyFlag(child.colb_requires_parent_id);
  const hasMuslimAttachment = isTruthyFlag(child.has_muslim_attachment);
  const isColbBrap = String(child.application_type || '').toLowerCase() === 'colb_brap';
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {child.last_name}, {child.first_name} {child.middle_name || ''}
        </h1>
        <div className="flex gap-2">
          <Link
            to={`${basePath}/${id}/certificate-of-live-birth`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Certificate of Live Birth
          </Link>
          <Link
            to={applicantDocumentsPath(basePath, id)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Document checklist
          </Link>
          <Link
            to={`${basePath}/${id}/paternity-affidavit`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Paternity Affidavit
          </Link>
          <Link
            to={`${basePath}/${id}/delayed-registration-affidavit`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Delayed Birth Affidavit
          </Link>
          <Link
            to={`${basePath}/${id}/print-certificate`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Print certification
          </Link>
          <Link hidden to={`${basePath}/${id}/field-position`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">here
          </Link>
          <Link hidden to={`${basePath}/${id}/field-position-back`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">here back
          </Link>
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={!isChecklistComplete}
            title={!isChecklistComplete ? 'Complete the document checklist first' : undefined}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          >
            Save Front as PDF
          </button>
          <button
            type="button"
            onClick={handleSavePdfBack}
            disabled={!isChecklistComplete}
            title={!isChecklistComplete ? 'Complete the document checklist first' : undefined}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          >
            Save Back as PDF
          </button>
          <button
            type="button"
            onClick={openEditModal}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <ApplicantStaffStatusPanel
        checklistTotal={checklistTotal}
        checklistChecked={checklistChecked}
        staffProcessStatus={child.staff_process_status}
        updating={staffStatusUpdating}
        onUpdateStaffStatus={handleStaffProcessStatus}
      />

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6" aria-labelledby="info-heading">
        <h2 id="info-heading" className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          Child identification
        </h2>
        {isColbBrap ? (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="mt-0.5 font-medium text-slate-800">
                {[child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Date of birth</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDateDDMMYYYY(child.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Gender</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatApplicantGenderLabel(child.gender) || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Age</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{child.age} years</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Place of birth</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{child.place_of_birth || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Contact no.</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{child.contact_no || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Marriage certificate</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{hasMarriageCertificate ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Parent / guardian I.D.</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{colbRequiresParentId ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Muslim attachment</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{hasMuslimAttachment ? 'Yes' : 'No'}</dd>
            </div>
            {child.created_at ? (
              <div>
                <dt className="text-sm text-slate-500">Created date</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {new Date(child.created_at.split(' ')[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </dd>
              </div>
            ) : null}
            {child.updated_at ? (
              <div>
                <dt className="text-sm text-slate-500">Updated date</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {new Date(child.updated_at.split(' ')[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4">
              <dt className="text-sm text-slate-500">Documents checklist</dt>
              <dd className="mt-1">
                {checklistTotal > 0 ? (
                  <div>
                    <p className="font-medium text-slate-800">
                      {checklistChecked}/{checklistTotal} complete
                    </p>
                    <div className="mt-2 h-2 w-full max-w-md rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width]"
                        style={{
                          width: `${checklistTotal ? Math.round((checklistChecked / checklistTotal) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <Link
                      to={applicantDocumentsPath(basePath, id)}
                      className="inline-block mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      View checklist →
                    </Link>
                  </div>
                ) : (
                  <p className="text-slate-600">
                    —{' '}
                    <Link to={applicantDocumentsPath(basePath, id)} className="text-emerald-600 hover:underline">
                      Open document checklist
                    </Link>{' '}
                    to get started.
                  </p>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="font-medium text-slate-800">
                {[child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Date of birth</dt>
              <dd className="font-medium text-slate-800">{formatDateDDMMYYYY(child.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Gender</dt>
              <dd className="font-medium text-slate-800">{formatApplicantGenderLabel(child.gender) || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Age</dt>
              <dd className="font-medium text-slate-800">{child.age} years</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Place of birth</dt>
              <dd className="font-medium text-slate-800">{child.place_of_birth || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Contact no.</dt>
              <dd className="font-medium text-slate-800">{child.contact_no || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Age group (requirements)</dt>
              <dd className="font-medium text-slate-800">{child.age_group?.replace(/_/g, ' ') || '—'}</dd>
            </div>
            {hasRegistrantDeceased || hasHilotDeceased || hasParentForeigner || hasOutOfTown ? (
              <div className="sm:col-span-2">
                <dt className="text-sm text-slate-500 mb-1">Conditional requirements</dt>
                <dd className="text-sm text-slate-700">
                  {hasRegistrantDeceased ? <span className="block">Death cert. (registrant)</span> : null}
                  {hasHilotDeceased && child.age <= 5 ? <span className="block">Death cert. (HILOT)</span> : null}
                  {hasParentForeigner ? <span className="block">Passport or BI cert. (foreign parent)</span> : null}
                  {hasOutOfTown ? <span className="block">Affidavit w/ Corroboration for Out-of-Town Applicant (Legal Office)</span> : null}
                </dd>
              </div>
            ) : null}
            {child.created_at && (
              <div>
                <dt className="text-sm text-slate-500">Created date</dt>
                <dd className="font-medium text-slate-800">
                  {new Date(child.created_at.split(' ')[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </dd>
              </div>
            )}
            {child.updated_at && (
              <div>
                <dt className="text-sm text-slate-500">Updated date</dt>
                <dd className="font-medium text-slate-800">
                  {new Date(child.updated_at.split(' ')[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500 mb-1">Documents checklist</dt>
              <dd className="mt-0.5">
                {checklistTotal > 0 ? (
                  <div>
                    <p className="font-medium text-slate-800">
                      {checklistChecked}/{checklistTotal} complete
                    </p>
                    <div className="mt-1.5 h-2 w-full max-w-[200px] rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width]"
                        style={{
                          width: `${checklistTotal ? Math.round((checklistChecked / checklistTotal) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <Link
                      to={applicantDocumentsPath(basePath, id)}
                      className="inline-block mt-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      View checklist →
                    </Link>
                  </div>
                ) : (
                  <p className="text-slate-600">
                    — <Link to={applicantDocumentsPath(basePath, id)} className="text-emerald-600 hover:underline">Open document checklist</Link> to get started.
                  </p>
                )}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setEditModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="edit-modal-title" className="text-lg font-semibold text-slate-800">
                {isColbBrap ? 'Edit COLB BRAP' : 'Edit applicant'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isColbBrap
                  ? 'Update profile details for this COLB BRAP record.'
                  : 'Update applicant details and adjust conditional requirements as needed.'}
              </p>
            </div>
            <form onSubmit={submitEdit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-6 overflow-y-auto p-6">
                <ApplicantFormFields
                  form={editForm}
                  onFieldChange={updateEditForm}
                  hideCoreIdentityFields
                  hideConditionalRequirements={isColbBrap}
                  showMarriageCertificateToggle={isColbBrap}
                />
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 sm:w-auto"
                >
                  {editSaving ? 'Saving…' : isColbBrap ? 'Update COLB BRAP' : 'Update applicant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => !deleteDeleting && setDeleteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-modal-title" className="text-lg font-semibold text-slate-800">
              {isColbBrap ? 'Delete COLB BRAP record' : 'Delete applicant'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isColbBrap ? 'Delete this COLB BRAP record? This cannot be undone.' : 'Delete this applicant? This cannot be undone.'}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
              >
                {deleteDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
