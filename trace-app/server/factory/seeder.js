/**
 * Seeds the local SQLite DB with fake children records.
 * Also writes `certificate_of_live_birth`, `delayed_registration_affidavit`, and `paternity_affidavit`
 * JSON aligned with the Certificate / Delayed Registration / Paternity affidavit pages.
 * Run from trace-app: npm run seed:applicants
 */
const { faker } = require('@faker-js/faker');
const { initDb } = require('../db');
const childModel = require('../models/child');

const SEED_COUNT = 50;
const SEED_COLB_BRAP_COUNT = 50;

const PH_CITIES = [
  'Manila', 'Quezon City', 'Davao City', 'Cebu City', 'Caloocan',
  'Zamboanga City', 'Antipolo', 'Pasig', 'Taguig', 'Valenzuela',
  'Cagayan de Oro', 'Parañaque', 'Dasmariñas', 'Makati', 'Bacolod',
  'Iloilo City', 'San Jose del Monte', 'Calamba', 'Mandaluyong', 'Angeles',
];

/** Match defaults in `src/pages/utils/CertificateOfLiveBirth.jsx` (registry header). */
const DEFAULT_PROVINCE = 'Lanao Del Norte';
const DEFAULT_CITY_MUNICIPALITY = 'Iligan City';
const DEFAULT_COUNTRY_CODE = 'PH';
const DEFAULT_COUNTRY_TEXT = 'PHILIPPINES';
const DEFAULT_CERTIFICATION_PURPOSE = 'ANY LEGAL';

/** Same options as CertificateOfLiveBirth “Received by” / “Registered by” selects. */
const RECEIVED_BY_OPTIONS = [
  { name: 'ATTY. YUSSIF DON JUSTIN F. MARTIL, REB', title: 'CITY CIVIL REGISTRAR' },
  { name: 'LORELIE L. CANTO', title: 'REGISTRATION OFFICER IV' },
  { name: 'PHOEBE L. BENIGA', title: 'REGISTRATION OFFICER II' },
  { name: 'JAN FLAURENCE A. OBLENDA', title: 'REGISTRATION OFFICER II' },
];

const ATTENDANT_TYPES = [
  'Physician',
  'Nurse',
  'Midwife',
  'Hilot (Traditional Birth Attendant)',
  'Others',
];

function formatDateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateParts(iso) {
  const trimmed = String(iso || '').trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (!m) return { day: '', month: '', year: '' };
  return { day: m[3], month: m[2], year: m[1] };
}

/** Three segments so Certificate “Place of birth” parses into name / city / province. */
function formatPlaceOfBirthTriple(placeName, city, province) {
  return [placeName, city, province].filter(Boolean).join(', ');
}

function joinName(first, middle, last) {
  return [first, middle, last]
    .map((s) => (s != null && String(s).trim() !== '' ? String(s).trim() : ''))
    .filter(Boolean)
    .join(' ');
}

/** @param {{ day: string, month: string, year: string }} parts */
function swornPartsFromIso(iso) {
  const { day, month, year } = parseDateParts(iso);
  return { swornDay: day, swornMonth: month, swornYear: year };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function attendantClock() {
  const h = faker.number.int({ min: 1, max: 12 });
  const m = faker.number.int({ min: 0, max: 59 });
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * Certificate JSON shape matches the form in CertificateOfLiveBirth.jsx (camelCase keys).
 * @param {object} applicant Row from buildFakeApplicant plus split place fields.
 */
function buildFakeCertificateOfLiveBirth(applicant) {
  const { day, month, year } = parseDateParts(applicant.date_of_birth);
  const birthInstitution = `${faker.company.name()} ${faker.helpers.arrayElement(['Hospital', 'Medical Center', 'Clinic'])}`;
  const placeName = applicant.place_of_birth_name || birthInstitution;
  const placeCity = applicant.place_of_birth_city || DEFAULT_CITY_MUNICIPALITY;
  const placeProvince = applicant.place_of_birth_province || DEFAULT_PROVINCE;
  const attendantType = faker.helpers.arrayElement(ATTENDANT_TYPES);
  const received = faker.helpers.arrayElement(RECEIVED_BY_OPTIONS);
  const registered = faker.helpers.arrayElement(RECEIVED_BY_OPTIONS);
  const marriageYearsBefore = faker.number.int({ min: 0, max: 15 });
  const birth = new Date(`${year}-${month}-${day}`);
  const marriage = new Date(birth);
  marriage.setFullYear(marriage.getFullYear() - marriageYearsBefore);
  const mMonth = String(marriage.getMonth() + 1);
  const mDay = String(marriage.getDate());
  const mYear = String(marriage.getFullYear());
  const weight = faker.number.int({ min: 2400, max: 4100 });
  const childrenBorn = faker.number.int({ min: 1, max: 5 });
  const childrenLiving = faker.number.int({ min: 1, max: childrenBorn });
  const childrenDead = String(Math.max(0, childrenBorn - childrenLiving));

  return {
    registryNo: faker.string.alphanumeric(10).toUpperCase(),
    province: DEFAULT_PROVINCE,
    cityMunicipality: DEFAULT_CITY_MUNICIPALITY,
    childFirst: applicant.first_name,
    childMiddle: applicant.middle_name || '',
    childLast: applicant.last_name,
    sex: faker.helpers.arrayElement(['Male', 'Female']),
    birthDay: day,
    birthMonth: month,
    birthYear: year,
    placeOfBirthName: placeName,
    placeOfBirthCity: placeCity,
    placeOfBirthProvince: placeProvince,
    typeOfBirth: faker.helpers.weightedArrayElement([
      { weight: 0.92, value: 'Single' },
      { weight: 0.05, value: 'Twin' },
      { weight: 0.03, value: 'Triplet' },
    ]),
    multipleBirthOrder: '',
    birthOrder: 'First',
    weightGrams: String(weight),
    motherFirst: faker.person.firstName('female'),
    motherMiddle: faker.datatype.boolean({ probability: 0.7 }) ? faker.person.middleName() : '',
    motherLast: faker.person.lastName(),
    motherCitizenship: 'Filipino',
    motherReligion: faker.helpers.arrayElement(['Roman Catholic', 'Islam', 'Christian', 'Iglesia ni Cristo', 'Protestant']),
    motherChildrenBornAlive: String(childrenBorn),
    motherChildrenLiving: String(childrenLiving),
    motherChildrenDead: childrenDead,
    motherOccupation: faker.person.jobTitle(),
    motherAge: String(faker.number.int({ min: 20, max: 42 })),
    motherResidenceLine1: faker.location.streetAddress(),
    motherResidenceCity: placeCity,
    motherResidenceProvince: placeProvince,
    motherResidenceCountry: DEFAULT_COUNTRY_CODE,
    motherCountry: DEFAULT_COUNTRY_TEXT,
    fatherFirst: faker.person.firstName('male'),
    fatherMiddle: faker.datatype.boolean({ probability: 0.65 }) ? faker.person.middleName() : '',
    fatherLast: faker.person.lastName(),
    fatherCitizenship: 'Filipino',
    fatherReligion: faker.helpers.arrayElement(['Roman Catholic', 'Islam', 'Christian', 'Protestant']),
    fatherOccupation: faker.person.jobTitle(),
    fatherAge: String(faker.number.int({ min: 22, max: 48 })),
    fatherResidenceLine1: faker.location.streetAddress(),
    fatherResidenceCity: placeCity,
    fatherResidenceProvince: placeProvince,
    fatherResidenceCountry: DEFAULT_COUNTRY_CODE,
    fatherCountry: DEFAULT_COUNTRY_TEXT,
    marriageMonth: mMonth,
    marriageDay: mDay,
    marriageYear: mYear,
    marriagePlaceCity: DEFAULT_CITY_MUNICIPALITY,
    marriagePlaceProvince: DEFAULT_PROVINCE,
    marriagePlaceCountry: DEFAULT_COUNTRY_TEXT,
    attendantType,
    attendantOthersSpecify: attendantType === 'Others' ? 'Family member' : '',
    attendantTime: attendantClock(),
    attendantAmpm: faker.helpers.arrayElement(['am', 'pm']),
    attendantName: `Dr. ${faker.person.fullName()}`,
    attendantAddress: faker.location.streetAddress({ useFullAddress: true }),
    attendantTitle: faker.helpers.arrayElement(['M.D.', 'R.N.', 'Midwife', 'Traditional Birth Attendant']),
    attendantDate: applicant.date_of_birth,
    informantName: faker.person.fullName(),
    informantAddress: faker.location.streetAddress({ useFullAddress: true }),
    informantRelationship: faker.helpers.arrayElement(['Mother', 'Father', 'Grandmother', 'Legal Guardian']),
    informantDate: applicant.date_of_birth,
    preparedByName: faker.person.fullName(),
    preparedByTitle: 'Registration Officer',
    preparedByDate: applicant.date_of_birth,
    receivedByName: received.name,
    receivedByTitle: received.title,
    receivedByDate: applicant.date_of_birth,
    registeredByName: registered.name,
    registeredByTitle: registered.title,
    registeredByDate: applicant.date_of_birth,
    remarks: '',
    certificationPurpose: DEFAULT_CERTIFICATION_PURPOSE,
  };
}

/**
 * JSON keys match `src/pages/utils/DelayedRegistrationAffidavit.jsx` initial form state.
 * @param {object} applicant from `buildFakeApplicant`
 * @param {object} cert from `buildFakeCertificateOfLiveBirth`
 */
function buildFakeDelayedRegistrationAffidavit(applicant, cert) {
  const motherFull = joinName(cert.motherFirst, cert.motherMiddle, cert.motherLast);
  const fatherFull = joinName(cert.fatherFirst, cert.fatherMiddle, cert.fatherLast);
  const childFull = joinName(applicant.first_name, applicant.middle_name, applicant.last_name);
  const isMarried = faker.datatype.boolean({ probability: 0.72 });
  const yi = Number(cert.marriageYear);
  const mi = Number(cert.marriageMonth);
  const di = Number(cert.marriageDay);
  let marriageDate = '';
  if (Number.isInteger(yi) && yi >= 1000 && yi <= 9999 && Number.isInteger(mi) && mi >= 1 && mi <= 12 && Number.isInteger(di) && di >= 1 && di <= 31) {
    const dt = new Date(yi, mi - 1, di);
    if (dt.getFullYear() === yi && dt.getMonth() === mi - 1 && dt.getDate() === di) {
      marriageDate = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    }
  }
  const marriagePlace = `${cert.marriagePlaceCity}, ${cert.marriagePlaceProvince}`;
  const sworn = swornPartsFromIso(applicant.date_of_birth);
  const officer = faker.helpers.arrayElement(RECEIVED_BY_OPTIONS);
  const affixed = swornPartsFromIso(applicant.date_of_birth);

  const affiantPronoun = applicant.sex === 'Male' ? 'HE' : 'SHE';

  return {
    affiantName: motherFull,
    affiantPronoun,
    maritalStatus: isMarried ? 'MARRIED' : 'SINGLE',
    residence: faker.location.streetAddress({ useFullAddress: true }),
    isSelfBirth: false,
    selfBirthPlace: '',
    selfBirthDate: '',
    isOtherBirth: true,
    otherBirthName: childFull,
    otherBirthPlace: applicant.place_of_birth,
    otherBirthDate: applicant.date_of_birth,
    attendedBy: cert.attendantName,
    attendantAddress: cert.attendantAddress,
    citizenship: 'the Philippines',
    isMarried,
    marriageDate: isMarried ? marriageDate : '',
    marriagePlace: isMarried ? marriagePlace : '',
    isNotMarried: !isMarried,
    notMarriedAcknowledged: !isMarried ? faker.datatype.boolean() : null,
    fatherName: fatherFull,
    delayReason: faker.helpers.arrayElement([
      'Late filing due to migration and incomplete documents at the time of birth.',
      'Parents were unaware of the registration deadline; hospital discharge summary obtained recently.',
      'Family resided outside the city; birth certificate application was deferred.',
    ]),
    spouseName: isMarried ? fatherFull : '',
    relationship: 'Mother',
    affixedDay: affixed.swornDay,
    affixedMonth: affixed.swornMonth,
    affixedAt: DEFAULT_CITY_MUNICIPALITY,
    swornDay: sworn.swornDay,
    swornMonth: sworn.swornMonth,
    swornYear: sworn.swornYear,
    swornAt: DEFAULT_CITY_MUNICIPALITY,
    ctcNo: faker.string.numeric(8),
    issuedOn: applicant.date_of_birth,
    issuedAt: DEFAULT_CITY_MUNICIPALITY,
    administeringOfficer: '',
    position: officer.title,
    nameInPrint: officer.name,
    address: `${DEFAULT_CITY_MUNICIPALITY}, ${DEFAULT_PROVINCE}`,
  };
}

/**
 * JSON keys match `src/pages/utils/PaternityAffidavit.jsx` initial form state.
 * @param {object} applicant from `buildFakeApplicant`
 * @param {object} cert from `buildFakeCertificateOfLiveBirth`
 */
function buildFakePaternityAffidavit(applicant, cert) {
  const motherFull = joinName(cert.motherFirst, cert.motherMiddle, cert.motherLast);
  const fatherFull = joinName(cert.fatherFirst, cert.fatherMiddle, cert.fatherLast);
  const childFull = joinName(applicant.first_name, applicant.middle_name, applicant.last_name);
  const sworn = swornPartsFromIso(applicant.date_of_birth);
  const officer = faker.helpers.arrayElement(RECEIVED_BY_OPTIONS);

  return {
    motherName: motherFull,
    fatherName: fatherFull,
    childName: childFull,
    dob: applicant.date_of_birth,
    pob: applicant.place_of_birth,
    fatherSignatureName: fatherFull,
    motherSignatureName: motherFull,
    swornDay: sworn.swornDay,
    swornMonth: sworn.swornMonth,
    swornYear: sworn.swornYear,
    swornBy1: fatherFull,
    swornBy2: motherFull,
    ctcNo: faker.string.numeric(8),
    issuedOn: applicant.date_of_birth,
    issuedAt: DEFAULT_CITY_MUNICIPALITY,
    administeringOfficer: '',
    position: officer.title,
    nameInPrint: officer.name,
    address: `${DEFAULT_CITY_MUNICIPALITY}, ${DEFAULT_PROVINCE}`,
  };
}

/** Builds one random applicant payload matching POST /api/children body. */
function buildFakeApplicant(applicationType = childModel.APPLICATION_APPLICANT) {
  const birth = faker.date.birthdate({ min: 0, max: 85, mode: 'age' });
  const city = faker.helpers.arrayElement(PH_CITIES);
  const placeName = `${faker.company.name()} ${faker.helpers.arrayElement(['Hospital', 'Medical Center', 'Clinic'])}`;
  const placeProvince = DEFAULT_PROVINCE;
  const placeCity = faker.datatype.boolean({ probability: 0.35 }) ? DEFAULT_CITY_MUNICIPALITY : city;
  return {
    first_name: faker.person.firstName(),
    middle_name: faker.datatype.boolean({ probability: 0.85 }) ? faker.person.middleName() : '',
    last_name: faker.person.lastName(),
    date_of_birth: formatDateOnly(birth),
    place_of_birth: formatPlaceOfBirthTriple(placeName, placeCity, placeProvince),
    place_of_birth_name: placeName,
    place_of_birth_city: placeCity,
    place_of_birth_province: placeProvince,
    contact_no: `09${faker.string.numeric(9)}`,
    registrant_deceased: faker.datatype.boolean({ probability: 0.08 }),
    hilot_deceased: faker.datatype.boolean({ probability: 0.06 }),
    parent_foreigner: faker.datatype.boolean({ probability: 0.1 }),
    out_of_town: faker.datatype.boolean({ probability: 0.1 }),
    application_type: applicationType,
  };
}

function seedOneApplicant(applicationType) {
  const row = buildFakeApplicant(applicationType);
  const id = childModel.create({
    first_name: row.first_name,
    middle_name: row.middle_name || undefined,
    last_name: row.last_name,
    date_of_birth: row.date_of_birth,
    place_of_birth: row.place_of_birth,
    contact_no: row.contact_no,
    registrant_deceased: row.registrant_deceased,
    hilot_deceased: row.hilot_deceased,
    parent_foreigner: row.parent_foreigner,
    out_of_town: row.out_of_town,
    application_type: row.application_type,
  });
  const cert = buildFakeCertificateOfLiveBirth(row);
  const childId = Number(id);
  childModel.updateCertificateOfLiveBirth(childId, cert);
  childModel.updateDelayedRegistrationAffidavit(childId, buildFakeDelayedRegistrationAffidavit(row, cert));
  childModel.updatePaternityAffidavit(childId, buildFakePaternityAffidavit(row, cert));
  return childId;
}

async function seedApplicants(count = SEED_COUNT, colbBrapCount = SEED_COLB_BRAP_COUNT) {
  await initDb();
  const ids = [];

  for (let i = 0; i < count; i += 1) {
    ids.push(seedOneApplicant(childModel.APPLICATION_APPLICANT));
  }

  for (let i = 0; i < colbBrapCount; i += 1) {
    ids.push(seedOneApplicant(childModel.APPLICATION_COLB_BRAP));
  }

  return ids;
}

if (require.main === module) {
  seedApplicants()
    .then((ids) => {
      console.log(`Seeded ${ids.length} records (${SEED_COUNT} applicants + ${SEED_COLB_BRAP_COUNT} COLB BRAP). Last id: ${ids[ids.length - 1]}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  buildFakeApplicant,
  buildFakeCertificateOfLiveBirth,
  buildFakeDelayedRegistrationAffidavit,
  buildFakePaternityAffidavit,
  seedApplicants,
  SEED_COUNT,
  SEED_COLB_BRAP_COUNT,
};
