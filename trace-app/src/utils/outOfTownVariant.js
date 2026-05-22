import { isTruthyFlag, resolveOutOfTownInformantIsOwner } from './applicantForm';

export const OUT_OF_TOWN_APPLICANT_VARIANT = 'applicant';
export const OUT_OF_TOWN_REPRESENTATIVE_VARIANT = 'representative';

export const OUT_OF_TOWN_VARIANT_LABEL = {
  [OUT_OF_TOWN_APPLICANT_VARIANT]: 'Out-of-Town Affidavit (Applicant)',
  [OUT_OF_TOWN_REPRESENTATIVE_VARIANT]: 'Out-of-Town Affidavit (Representative)',
};

export const OUT_OF_TOWN_VARIANT_SHORT_LABEL = {
  [OUT_OF_TOWN_APPLICANT_VARIANT]: 'Applicant (document owner)',
  [OUT_OF_TOWN_REPRESENTATIVE_VARIANT]: 'Representative (not document owner)',
};

/**
 * @param {object | null | undefined} child
 * @returns {typeof OUT_OF_TOWN_APPLICANT_VARIANT | typeof OUT_OF_TOWN_REPRESENTATIVE_VARIANT}
 */
export function getOutOfTownVariantForChild(child) {
  return resolveOutOfTownInformantIsOwner(child)
    ? OUT_OF_TOWN_APPLICANT_VARIANT
    : OUT_OF_TOWN_REPRESENTATIVE_VARIANT;
}

/**
 * @param {object | null | undefined} child
 */
export function shouldShowOutOfTownAffidavit(child) {
  return isTruthyFlag(child?.out_of_town);
}

/**
 * @param {string} basePath
 * @param {string | number} id
 */
export function buildOutOfTownAffidavitPrintPath(basePath, id) {
  return `${basePath}/${id}/out-of-town-affidavit/print`;
}

/**
 * @param {string} basePath
 * @param {string | number} id
 */
export function buildOutOfTownAffidavitEditPath(basePath, id) {
  return `${basePath}/${id}/out-of-town-affidavit`;
}
