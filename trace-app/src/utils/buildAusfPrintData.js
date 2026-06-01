import { buildMergedCertData } from './pdfUtils';

const DEFAULT_CCR_NAME = 'ATTY. YUSSIF DON JUSTIN F. MARTIL, REB';
/** Legacy COLB / seeder value — maps to {@link DEFAULT_CCR_NAME} for AUSF print. */
const LEGACY_CCR_NAME = 'ATTY. YUSSIF DON JUSTIN F. MARTIL';
const DEFAULT_CONTACT_EMAIL = 'civilregistrar.iligan@gmail.com';
const DEFAULT_CONTACT_PHONE = '(063) 228-1311';

function trim(value) {
  return value == null ? '' : String(value).trim();
}

function certDateFromParts(cert) {
  const y = trim(cert.birthYear || cert.birth_year);
  const m = trim(cert.birthMonth || cert.birth_month);
  const d = trim(cert.birthDay || cert.birth_day);
  if (!y || !m || !d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function colbRegistrationDate(cert) {
  return (
    trim(cert.registeredByDate || cert.registered_by_date) ||
    trim(cert.receivedByDate || cert.received_by_date) ||
    ''
  );
}

function marriageDateIso(cert) {
  const y = trim(cert.marriageYear || cert.marriage_year);
  const m = trim(cert.marriageMonth || cert.marriage_month);
  const d = trim(cert.marriageDay || cert.marriage_day);
  if (!y || !m || !d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function marriageOffice(cert) {
  const city = trim(cert.marriagePlaceCity || cert.marriage_place_city);
  const province = trim(cert.marriagePlaceProvince || cert.marriage_place_province);
  return [city, province].filter(Boolean).join(', ');
}

function mapRelationshipToChild(cert, child) {
  const rel = trim(cert.informantRelationship || cert.informant_relationship).toUpperCase();
  if (rel === 'MYSELF') return 'MYSELF';
  if (rel === 'GUARDIAN') return 'GUARDIAN';

  const gender = trim(child?.gender || cert.sex || cert.gender).toUpperCase();
  const childLabel = gender === 'FEMALE' ? 'DAUGHTER' : 'SON';

  if (rel === 'FATHER' || rel === 'MOTHER') return childLabel;
  return childLabel;
}

function normalizeCityCivilRegistrarName(name) {
  const value = trim(name);
  if (!value) return DEFAULT_CCR_NAME;
  if (value.toUpperCase() === LEGACY_CCR_NAME.toUpperCase()) return DEFAULT_CCR_NAME;
  if (value.toUpperCase() === DEFAULT_CCR_NAME.toUpperCase()) return DEFAULT_CCR_NAME;
  return value;
}

function cityCivilRegistrarName(cert) {
  const custom = trim(cert.ausfCityCivilRegistrarName || cert.ausf_city_civil_registrar_name);
  if (custom) return normalizeCityCivilRegistrarName(custom);

  const receivedTitle = trim(cert.receivedByTitle || cert.received_by_title).toUpperCase();
  const receivedName = trim(cert.receivedByName || cert.received_by_name);
  if (receivedTitle.includes('CIVIL REGISTRAR') && receivedName) {
    return normalizeCityCivilRegistrarName(receivedName);
  }

  return DEFAULT_CCR_NAME;
}

/**
 * Map applicant + Certificate of Live Birth record into AUSF print payload.
 */
export function buildAusfPrintData(child, cert) {
  const merged = buildMergedCertData(child, cert || {});

  const publicDocRegistryNo =
    trim(merged.publicDocRegistryNo || merged.public_doc_registry_no) ||
    trim(merged.marriageRegistryNo || merged.marriage_registry_no);

  const publicDocDate =
    trim(merged.publicDocDate || merged.public_doc_date) || marriageDateIso(merged);

  const publicDocOffice =
    trim(merged.publicDocOffice || merged.public_doc_office) || marriageOffice(merged);

  return {
    applicantName: trim(merged.informantName || merged.informant_name),
    childFirst: merged.childFirst,
    childMiddle: merged.childMiddle,
    childLast: merged.childLast,
    fatherFirst: merged.fatherFirst || merged.father_first || '',
    fatherMiddle: merged.fatherMiddle || merged.father_middle || '',
    fatherLast: merged.fatherLast || merged.father_last || '',
    relationshipToChild: mapRelationshipToChild(merged, child),
    dateOfBirth: trim(child?.date_of_birth) || certDateFromParts(merged),
    colbRegistryNo: trim(merged.registryNo || merged.registry_no),
    colbDateOfRegistration: colbRegistrationDate(merged),
    publicDocRegistryNo,
    publicDocDate,
    publicDocOffice,
    filingLocation: trim(merged.filingLocation || merged.filing_location || merged.cityMunicipality || merged.city_municipality) || 'ILIGAN CITY',
    affidavitExecutionDate: trim(merged.affidavitExecutionDate || merged.affidavit_execution_date || merged.informantDate || merged.informant_date),
    placeOfBirthAddress: trim(merged.placeOfBirthName || merged.place_of_birth_name),
    placeOfBirthCity: trim(merged.placeOfBirthCity || merged.place_of_birth_city),
    placeOfBirthProvince: trim(merged.placeOfBirthProvince || merged.place_of_birth_province),
    ausfRegistryNo: trim(merged.ausfRegistryNo || merged.ausf_registry_no),
    cityCivilRegistrarName: cityCivilRegistrarName(merged),
    contactPhone: trim(child?.contact_no) || DEFAULT_CONTACT_PHONE,
    contactEmail: trim(merged.ausfContactEmail || merged.ausf_contact_email) || DEFAULT_CONTACT_EMAIL,
  };
}
