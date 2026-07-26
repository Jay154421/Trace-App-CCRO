import { isTruthyFlag } from './applicantForm';
import { AUSF_06_PRINT_TYPE } from '../pages/utils/ausf1';
import { AUSF_0717_PRINT_TYPE } from '../pages/utils/ausf2';
import { AUSF_ONLY_PRINT_TYPE } from '../pages/utils/ausf3';

/** @typedef {typeof AUSF_06_PRINT_TYPE | typeof AUSF_0717_PRINT_TYPE | typeof AUSF_ONLY_PRINT_TYPE} AusfPrintVariant */

export const AUSF_VARIANT_PATH = {
  [AUSF_06_PRINT_TYPE]: 'ausf-0-6',
  [AUSF_0717_PRINT_TYPE]: 'ausf-07-17',
  [AUSF_ONLY_PRINT_TYPE]: 'ausf-only',
};

export const AUSF_VARIANT_LABEL = {
  [AUSF_06_PRINT_TYPE]: 'AUSF (0–6)',
  [AUSF_0717_PRINT_TYPE]: 'AUSF (7–17)',
  [AUSF_ONLY_PRINT_TYPE]: 'AUSF (Adult)',
};

/**
 * @param {string | null | undefined} dob — ISO date (YYYY-MM-DD)
 * @returns {number | null}
 */
export function calculateAgeFromDob(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/**
 * @param {number | null | undefined} ageYears
 * @returns {AusfPrintVariant}
 */
export function resolveAusfVariantForAge(ageYears) {
  const age = typeof ageYears === 'number' && Number.isFinite(ageYears) ? ageYears : 0;
  if (age <= 6) return AUSF_06_PRINT_TYPE;
  if (age <= 17) return AUSF_0717_PRINT_TYPE;
  return AUSF_ONLY_PRINT_TYPE;
}

/**
 * @param {object | null | undefined} child — applicant record
 * @returns {number | null}
 */
export function getApplicantAgeYears(child) {
  if (!child) return null;
  if (typeof child.age === 'number' && Number.isFinite(child.age)) return child.age;
  return calculateAgeFromDob(child.date_of_birth);
}

/**
 * AUSF applies when parents are not marked as married (no marriage contract on file).
 * @param {object | null | undefined} child
 */
export function shouldShowAusfForChild(child) {
  return !isTruthyFlag(child?.has_marriage_certificate);
}

/**
 * @param {object | null | undefined} child
 * @returns {AusfPrintVariant}
 */
export function getAusfVariantForChild(child) {
  return resolveAusfVariantForAge(getApplicantAgeYears(child));
}

/**
 * @param {AusfPrintVariant} variant
 * @returns {string}
 */
export function getAusfPathSegment(variant) {
  return AUSF_VARIANT_PATH[variant] || AUSF_VARIANT_PATH[AUSF_ONLY_PRINT_TYPE];
}

/**
 * @param {string} basePath — e.g. `/children` or `/colb-brap`
 * @param {string | number} id
 * @param {AusfPrintVariant} variant
 */
export function buildAusfPrintPath(basePath, id, variant) {
  return `${basePath}/${id}/${getAusfPathSegment(variant)}`;
}
