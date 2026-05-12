export function toUpperCaseTrimmed(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toUpperCase();
}

export function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
  }
  return Boolean(value);
}

/** Shared placeholders for applicant profile text/date inputs (modal + full-page form). */
export const applicantInputPlaceholders = {
  firstName: 'Enter first name',
  middleName: 'Enter middle name',
  lastName: 'Enter last name',
  dateOfBirth: 'dd/mm/yyyy',
  contactNo: '09XX XXX XXXX',
  placeOfBirth: '(Name of Hospital/Clinic/Institution/House No., St., Barangay)',
};

/** Normalizes API/DB gender to form select value: '' | 'male' | 'female'. */
export function normalizeApplicantGender(value) {
  const g = String(value ?? '').trim().toLowerCase();
  return g === 'male' || g === 'female' ? g : '';
}

/** Label for read-only display (detail page, lists). */
export function formatApplicantGenderLabel(value) {
  const g = normalizeApplicantGender(value);
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  return '';
}

export const emptyApplicantForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  place_of_birth: '',
  contact_no: '',
  registrant_deceased: false,
  hilot_deceased: false,
  parent_foreigner: false,
  out_of_town: false,
  has_marriage_certificate: false,
  colb_requires_parent_id: false,
  has_muslim_attachment: false,
};

export function mapApplicantToForm(data) {
  return {
    first_name: toUpperCaseTrimmed(data?.first_name ?? ''),
    middle_name: toUpperCaseTrimmed(data?.middle_name ?? ''),
    last_name: toUpperCaseTrimmed(data?.last_name ?? ''),
    gender: normalizeApplicantGender(data?.gender),
    date_of_birth: data?.date_of_birth ?? '',
    place_of_birth: toUpperCaseTrimmed(data?.place_of_birth ?? ''),
    contact_no: toUpperCaseTrimmed(data?.contact_no ?? ''),
    registrant_deceased: isTruthyFlag(data?.registrant_deceased),
    hilot_deceased: isTruthyFlag(data?.hilot_deceased),
    parent_foreigner: isTruthyFlag(data?.parent_foreigner),
    out_of_town: isTruthyFlag(data?.out_of_town),
    has_marriage_certificate: isTruthyFlag(data?.has_marriage_certificate),
    colb_requires_parent_id: isTruthyFlag(data?.colb_requires_parent_id),
    has_muslim_attachment: isTruthyFlag(data?.has_muslim_attachment),
  };
}

export function buildApplicantPayload(form) {
  return {
    first_name: toUpperCaseTrimmed(form.first_name),
    middle_name: toUpperCaseTrimmed(form.middle_name) || undefined,
    last_name: toUpperCaseTrimmed(form.last_name),
    gender: normalizeApplicantGender(form.gender),
    date_of_birth: form.date_of_birth,
    place_of_birth: toUpperCaseTrimmed(form.place_of_birth) || undefined,
    contact_no: toUpperCaseTrimmed(form.contact_no) || undefined,
    registrant_deceased: form.registrant_deceased,
    hilot_deceased: form.hilot_deceased,
    parent_foreigner: form.parent_foreigner,
    out_of_town: form.out_of_town,
    has_marriage_certificate: form.has_marriage_certificate,
    colb_requires_parent_id: !!form.colb_requires_parent_id,
    has_muslim_attachment: !!form.has_muslim_attachment,
  };
}

/**
 * Shared Enter key handler to move focus to the next input in the form.
 * Useful for sequential data entry.
 */
export function handleEnterKey(e) {
  if (e.key !== 'Enter') return;

  // Don't intercept Enter on buttons or textareas (unless specifically needed)
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;

  // Find the parent form
  const form = e.target.form;
  if (!form) return;

  // Get all focusable elements that aren't hidden or disabled
  // We exclude buttons to avoid accidental submission while navigating
  const elements = Array.from(form.elements).filter((el) => {
    const isVisible = el.offsetWidth > 0 || el.offsetHeight > 0;
    const isNotButton = el.tagName !== 'BUTTON' && el.type !== 'submit';
    return isVisible && !el.disabled && el.tabIndex !== -1 && isNotButton;
  });

  const index = elements.indexOf(e.target);
  if (index > -1 && index < elements.length - 1) {
    e.preventDefault();
    elements[index + 1].focus();
  }
}
