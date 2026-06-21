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
  placeOfBirthAddress: 'Enter Address',
  placeOfBirthCity: 'Enter City',
  placeOfBirthProvince: 'Enter Province',
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

/** COLB/BRAP conditional document flags that were checked (empty when none selected). */
export function getColbConditionalRequirementLabels(data) {
  const labels = [];
  if (isTruthyFlag(data?.has_marriage_certificate)) labels.push('Marriage certificate');
  if (isTruthyFlag(data?.colb_requires_parent_id)) labels.push('Parent / guardian I.D.');
  if (isTruthyFlag(data?.has_muslim_attachment)) labels.push('Muslim attachment');
  /* Age 80+ → Verification Results */
  const age = typeof data?.age === 'number'
    ? data.age
    : (data?.date_of_birth ? calculateAgeFromDate(data.date_of_birth) : 0);
  if (age >= 80) labels.push('Verification Results');
  return labels;
}

/** Calculate age in whole years from a date string (YYYY-MM-DD or similar). */
function calculateAgeFromDate(dob) {
  if (!dob) return 0;
  const birth = new Date(dob.split(' ')[0]);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Parse a combined place_of_birth string into { address, city, province }.
 * Expected format: "ADDRESS, CITY, PROVINCE" (comma-separated).
 */
export function splitPlaceOfBirth(combined) {
  if (!combined || !String(combined).trim()) {
    return { place_of_birth_address: '', place_of_birth_city: '', place_of_birth_province: '' };
  }
  const parts = String(combined).split(',').map((s) => s.trim().toUpperCase());
  return {
    place_of_birth_address: parts[0] || '',
    place_of_birth_city: parts[1] || '',
    place_of_birth_province: parts[2] || '',
  };
}

/**
 * Join address, city, province into a single place_of_birth string.
 * Skips empty segments, joins non-empty with ", ".
 */
export function joinPlaceOfBirth(address, city, province) {
  const segments = [address, city, province].filter((s) => s && String(s).trim());
  return segments.length ? segments.join(', ') : '';
}

export const emptyApplicantForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  place_of_birth_address: '',
  place_of_birth_city: '',
  place_of_birth_province: '',
  contact_no: '',
  registrant_deceased: false,
  hilot_deceased: false,
  parent_foreigner: false,
  out_of_town: false,
  out_of_town_informant_is_owner: true,
  has_marriage_certificate: false,
  colb_requires_parent_id: false,
  has_muslim_attachment: false,
};

export function mapApplicantToForm(data) {
  const { place_of_birth_address, place_of_birth_city, place_of_birth_province } = splitPlaceOfBirth(data?.place_of_birth);
  return {
    first_name: toUpperCaseTrimmed(data?.first_name ?? ''),
    middle_name: toUpperCaseTrimmed(data?.middle_name ?? ''),
    last_name: toUpperCaseTrimmed(data?.last_name ?? ''),
    gender: normalizeApplicantGender(data?.gender),
    date_of_birth: data?.date_of_birth ?? '',
    place_of_birth_address,
    place_of_birth_city,
    place_of_birth_province,
    contact_no: toUpperCaseTrimmed(data?.contact_no ?? ''),
    registrant_deceased: isTruthyFlag(data?.registrant_deceased),
    hilot_deceased: isTruthyFlag(data?.hilot_deceased),
    parent_foreigner: isTruthyFlag(data?.parent_foreigner),
    out_of_town: isTruthyFlag(data?.out_of_town),
    out_of_town_informant_is_owner: resolveOutOfTownInformantIsOwner(data),
    has_marriage_certificate: isTruthyFlag(data?.has_marriage_certificate),
    colb_requires_parent_id: isTruthyFlag(data?.colb_requires_parent_id),
    has_muslim_attachment: isTruthyFlag(data?.has_muslim_attachment),
  };
}

/** When out-of-town is set: true = informant is document owner (applicant form); false = representative (2nd person). */
export function resolveOutOfTownInformantIsOwner(data) {
  if (!isTruthyFlag(data?.out_of_town)) return true;
  if (data?.out_of_town_informant_is_owner === undefined || data?.out_of_town_informant_is_owner === null) {
    return true;
  }
  return isTruthyFlag(data.out_of_town_informant_is_owner);
}

export function buildApplicantPayload(form) {
  const outOfTown = !!form.out_of_town;
  return {
    first_name: toUpperCaseTrimmed(form.first_name),
    middle_name: toUpperCaseTrimmed(form.middle_name) || undefined,
    last_name: toUpperCaseTrimmed(form.last_name),
    gender: normalizeApplicantGender(form.gender),
    date_of_birth: form.date_of_birth,
    place_of_birth: joinPlaceOfBirth(
      form.place_of_birth_address,
      form.place_of_birth_city,
      form.place_of_birth_province
    ) || undefined,
    contact_no: toUpperCaseTrimmed(form.contact_no) || undefined,
    registrant_deceased: form.registrant_deceased,
    hilot_deceased: form.hilot_deceased,
    parent_foreigner: form.parent_foreigner,
    out_of_town: outOfTown,
    out_of_town_informant_is_owner: outOfTown ? !!form.out_of_town_informant_is_owner : undefined,
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

/**
 * The minimum number of total attachments required across all age-specific items
 * before the checklist can be considered complete. Defaults to 2.
 */
const MIN_AGE_SPECIFIC_ATTACHMENTS = 2;

/**
 * Parse the raw server `attachment` field into an array of filenames.
 * The server stores it as a JSON string array (e.g. '["file1.jpg"]')
 * or a single filename string.
 */
function parseRawServerAttachment(attachment) {
  if (!attachment) return [];
  if (typeof attachment === 'string' && attachment.startsWith('[')) {
    try {
      return JSON.parse(attachment);
    } catch {
      return [attachment];
    }
  }
  return [attachment];
}

/**
 * Count total attachments (pending + saved + raw server) for a single checklist item.
 */
function countItemAttachments(item) {
  const pending = item.attachmentFiles?.length ?? 0;
  const saved = item.attachmentFilenames?.length ?? 0;
  const raw = parseRawServerAttachment(item.attachment).length;
  return pending + saved + raw;
}

/**
 * Count total attachments across all age-specific checklist items.
 */
export function countAgeSpecificAttachments(checklist) {
  if (!Array.isArray(checklist)) return 0;
  return checklist
    .filter((item) => item?.category === 'age_specific')
    .reduce((sum, item) => sum + countItemAttachments(item), 0);
}

/**
 * Returns true when the checklist has at least MIN_AGE_SPECIFIC_ATTACHMENTS
 * total attachments across all age-specific items.
 * If there are no age-specific items at all, the minimum is trivially met.
 */
export function hasMinimumAgeSpecificAttachments(checklist) {
  if (!Array.isArray(checklist)) return true;
  const ageSpecificItems = checklist.filter((item) => item?.category === 'age_specific');
  if (ageSpecificItems.length === 0) return true;
  const totalAttachments = countAgeSpecificAttachments(checklist);
  return totalAttachments >= MIN_AGE_SPECIFIC_ATTACHMENTS;
}

/**
 * Labels of conditional documents that are informational only and NOT required
 * for the checklist to be considered "fully complete". These never block
 * PDF generation (Front PDF / Back PDF).
 * Note: labels are used instead of IDs because stored checklist items persist
 * only category, label, checked, notes, and attachmentFilenames — not the `id` field.
 */
const NON_REQUIRED_CONDITIONAL_LABELS = new Set([
  'Affidavit of Discrepancy',
  'Affidavit of One and the Same Person',
  'Affidavit of Discrep (One and the Same Person)',
]);

/**
 * Returns true when the checklist is fully complete:
 * - All general items have attachments
 * - At least MIN_AGE_SPECIFIC_ATTACHMENTS total attachments across age-specific items
 * - All conditional items have attachments (except non-required conditional docs)
 *
 * Unlike the simpler "all items checked" logic, this allows age-specific items
 * to be satisfied by having the minimum number of attachments rather than
 * requiring every single age-specific item to be individually checked.
 */
export function isChecklistFullyComplete(checklist) {
  if (!Array.isArray(checklist) || checklist.length === 0) return false;
  const general = checklist.filter((item) => item?.category === 'general');
  const ageSpecific = checklist.filter((item) => item?.category === 'age_specific');
  const conditional = checklist.filter((item) => item?.category === 'conditional' && !NON_REQUIRED_CONDITIONAL_LABELS.has(item?.label));
  const generalAllChecked = general.every((item) => countItemAttachments(item) > 0);
  const conditionalAllChecked = conditional.every((item) => countItemAttachments(item) > 0);
  const ageSpecificMet = ageSpecific.length === 0
    ? true
    : countAgeSpecificAttachments(checklist) >= MIN_AGE_SPECIFIC_ATTACHMENTS;
  return generalAllChecked && conditionalAllChecked && ageSpecificMet;
}
