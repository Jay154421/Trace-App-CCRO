const GENERAL_DOCS = [
  { id: 'national_id', label: 'National I.D' },
  { id: 'psa_negative', label: 'PSA Negative' },
  { id: 'affidavit_two_witnesses', label: 'Affidavit of Two Witnesses (Legal Office)' },
  { id: 'affidavit_abandonment', label: 'Affidavit of Abandonment (Legal Office)' },
  { id: 'affidavit_guardianship', label: 'Affidavit of Guardianship (Legal Office)' },
  { id: 'brgy_facts_birth', label: 'Brgy. Certification (Facts of Birth)' },
  { id: 'brgy_residency', label: 'Brgy. Residency' },
  { id: 'photo_2x2', label: '2x2 Photo I.D. with white background (studio copy: 1, out-of-town: 2)' },
];

const AGE_1M_TO_6 = [
  { id: 'immunization', label: 'Immunization record (5yo+ Immunization Cert\'n)' },
  { id: 'baptismal', label: 'Baptismal certificate (*Siblings\' COLB if born at home)' },
  { id: 'form_137', label: 'Form 137/school records or certification' },
  { id: 'ausf', label: 'AUSF (Affidavit to Use Surname of Father) / Appearance of both parents (married/not married)' },
  { id: 'marriage_contract', label: 'Marriage contract of parents (if married)' },
  { id: 'parents_id_birth', label: 'Valid I.D. & birth cert of parents' },
];

const AGE_7_TO_17 = [
  { id: 'baptismal', label: 'Baptismal certificate / siblings\' COLB (esp. if born at home)' },
  { id: 'form_137_sf10', label: 'Form 137 SF10-ES and/or school cert' },
  { id: 'appearance_parents_applicant', label: 'Appearance of both parents and applicant' },
  { id: 'ausf', label: 'AUSF (Affidavit to Use Surname of Father)' },
  { id: 'marriage_contract', label: 'Marriage contract of parents' },
  { id: 'parents_id_birth', label: 'Valid I.D. & birth cert of parents' },
];

const AGE_18_TO_59 = [
  { id: 'baptismal', label: 'Baptismal certificate' },
  { id: 'form_137_sf10', label: 'Form 137 SF10-ES and/or school cert' },
  { id: 'voters_cert', label: 'Voter\'s certification / registration record' },
  { id: 'police_nbi', label: 'Police or NBI clearance' },
  { id: 'service_record', label: 'Service record' },
  { id: 'marriage_cert', label: 'Marriage certificate (applicant or parents) with place of birth' },
  { id: 'sss_gsis_philhealth', label: 'SSS-E4, GSIS, or MDR-PhilHealth' },
  { id: 'applicant_appearance', label: 'Applicant\'s appearance' },
  { id: 'siblings_birth', label: 'Siblings\' birth certificate, etc.' },
  { id: 'parents_id_birth', label: 'Valid I.D.s & birth cert of parents' },
];

const AGE_60_PLUS = [
  { id: 'baptismal', label: 'Baptismal certificate' },
  { id: 'children_birth_1960_1984', label: 'Children\'s birth certificates (1960–1984)' },
  { id: 'service_insurance', label: 'Service record / insurance policy' },
  { id: 'marriage_cert', label: 'Marriage certificate (applicant or parents, with place of birth)' },
  { id: 'voters_cert', label: 'Voter\'s certification / registration record' },
  { id: 'police_nbi', label: 'Police or NBI clearance' },
  { id: 'sss_gsis_philhealth', label: 'SSS-E4, GSIS, or MDR-PhilHealth' },
  { id: 'siblings_docs', label: 'Siblings\' birth, COM, baptismal or death certificate' },
  { id: 'applicant_appearance', label: 'Applicant\'s appearance' },
  { id: 'parents_docs', label: 'Parent\'s birth/ID/death certificate (if deceased)' },
];

const CONDITIONAL_DOCS = {
  death_cert_registrant: { id: 'death_cert_registrant', label: 'Death certificate (registrant)' },
  death_cert_hilot: { id: 'death_cert_hilot', label: 'Death certificate (HILOT)' },
  foreign_parent_id: { id: 'foreign_parent_id', label: 'Passport or Bureau of Immigration cert. (foreign parent)' },
  affidavit_corroboration_out_of_town: { id: 'out_of_town_affidavit_legal_office', label: 'Affidavit w/ Corroboration for Out-of-Town Applicant (Legal Office)' },
};

const PHOTO_ID_SCANNER_CAPTURE_SIZE = { width: 600, height: 600, label: '2 x 2 in' };

function withScannerCaptureSize(document) {
  if (document.id !== 'photo_2x2') {
    return { ...document };
  }

  return {
    ...document,
    scannerCaptureSize: { ...PHOTO_ID_SCANNER_CAPTURE_SIZE },
  };
}

function getRequirementsForAgeGroup(ageGroup) {
  const allGeneral = GENERAL_DOCS.map(d => ({ ...withScannerCaptureSize(d), category: 'general' }));
  let ageSpecific = [];
  switch (ageGroup) {
    case '1m1d_to_6': ageSpecific = AGE_1M_TO_6; break;
    case '7_to_17': ageSpecific = AGE_7_TO_17; break;
    case '18_to_59': ageSpecific = AGE_18_TO_59; break;
    case '60_plus': ageSpecific = AGE_60_PLUS; break;
    default: ageSpecific = AGE_1M_TO_6;
  }
  return {
    general: allGeneral,
    ageSpecific: ageSpecific.map(d => ({ ...withScannerCaptureSize(d), category: 'age_specific' })),
    all: [...allGeneral, ...ageSpecific.map(d => ({ ...withScannerCaptureSize(d), category: 'age_specific' }))],
  };
}

function getRequirementsForChild(child) {
  const base = getRequirementsForAgeGroup(child.age_group || '1m1d_to_6');
  const conditional = [];
  if (child.registrant_deceased) {
    conditional.push({ ...withScannerCaptureSize(CONDITIONAL_DOCS.death_cert_registrant), category: 'conditional' });
  }
  const age = typeof child.age === 'number' ? child.age : (child.date_of_birth ? require('./child').calculateAge(child.date_of_birth) : 0);
  if (child.hilot_deceased && age <= 5) {
    conditional.push({ ...withScannerCaptureSize(CONDITIONAL_DOCS.death_cert_hilot), category: 'conditional' });
  }
  if (child.parent_foreigner) {
    conditional.push({ ...withScannerCaptureSize(CONDITIONAL_DOCS.foreign_parent_id), category: 'conditional' });
  }
  if (child.out_of_town) {
    conditional.push({ ...withScannerCaptureSize(CONDITIONAL_DOCS.affidavit_corroboration_out_of_town), category: 'conditional' });
  }
  const all = [...base.all, ...conditional];
  return {
    ...base,
    conditional,
    all,
  };
}

module.exports = { getRequirementsForAgeGroup, getRequirementsForChild, GENERAL_DOCS, AGE_1M_TO_6, AGE_7_TO_17, AGE_18_TO_59, AGE_60_PLUS };
