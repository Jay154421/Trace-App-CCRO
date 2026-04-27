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
};

export function mapApplicantToForm(data) {
  return {
    first_name: data?.first_name ?? '',
    middle_name: data?.middle_name ?? '',
    last_name: data?.last_name ?? '',
    date_of_birth: data?.date_of_birth ?? '',
    place_of_birth: data?.place_of_birth ?? '',
    contact_no: data?.contact_no ?? '',
    registrant_deceased: isTruthyFlag(data?.registrant_deceased),
    hilot_deceased: isTruthyFlag(data?.hilot_deceased),
    parent_foreigner: isTruthyFlag(data?.parent_foreigner),
    out_of_town: isTruthyFlag(data?.out_of_town),
  };
}

export function buildApplicantPayload(form) {
  return {
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim() || undefined,
    last_name: form.last_name.trim(),
    date_of_birth: form.date_of_birth,
    place_of_birth: form.place_of_birth.trim() || undefined,
    contact_no: form.contact_no.trim() || undefined,
    registrant_deceased: form.registrant_deceased,
    hilot_deceased: form.hilot_deceased,
    parent_foreigner: form.parent_foreigner,
    out_of_town: form.out_of_town,
  };
}
