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

export const emptyApplicantForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  place_of_birth: '',
  contact_no: '',
  registrant_deceased: false,
  hilot_deceased: false,
  parent_foreigner: false,
  out_of_town: false,
  has_marriage_certificate: false,
};

export function mapApplicantToForm(data) {
  return {
    first_name: toUpperCaseTrimmed(data?.first_name ?? ''),
    middle_name: toUpperCaseTrimmed(data?.middle_name ?? ''),
    last_name: toUpperCaseTrimmed(data?.last_name ?? ''),
    date_of_birth: data?.date_of_birth ?? '',
    place_of_birth: toUpperCaseTrimmed(data?.place_of_birth ?? ''),
    contact_no: toUpperCaseTrimmed(data?.contact_no ?? ''),
    registrant_deceased: isTruthyFlag(data?.registrant_deceased),
    hilot_deceased: isTruthyFlag(data?.hilot_deceased),
    parent_foreigner: isTruthyFlag(data?.parent_foreigner),
    out_of_town: isTruthyFlag(data?.out_of_town),
    has_marriage_certificate: isTruthyFlag(data?.has_marriage_certificate),
  };
}

export function buildApplicantPayload(form) {
  return {
    first_name: toUpperCaseTrimmed(form.first_name),
    middle_name: toUpperCaseTrimmed(form.middle_name) || undefined,
    last_name: toUpperCaseTrimmed(form.last_name),
    date_of_birth: form.date_of_birth,
    place_of_birth: toUpperCaseTrimmed(form.place_of_birth) || undefined,
    contact_no: toUpperCaseTrimmed(form.contact_no) || undefined,
    registrant_deceased: form.registrant_deceased,
    hilot_deceased: form.hilot_deceased,
    parent_foreigner: form.parent_foreigner,
    out_of_town: form.out_of_town,
    has_marriage_certificate: form.has_marriage_certificate,
  };
}
