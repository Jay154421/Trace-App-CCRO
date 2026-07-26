const COLB_BRAP_BASE = '/colb-brap';
const APPLICANT_BASE = '/children';

export function getApplicantBasePath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path === COLB_BRAP_BASE || path.startsWith(`${COLB_BRAP_BASE}/`)) {
    return COLB_BRAP_BASE;
  }
  return APPLICANT_BASE;
}

export function getApplicantBasePathForRecord(applicationType) {
  return String(applicationType || '').trim().toLowerCase() === 'colb_brap' ? COLB_BRAP_BASE : APPLICANT_BASE;
}

export function applicantDetailPath(basePath, id) {
  return `${basePath}/${id}`;
}

export function applicantDocumentsPath(basePath, id) {
  return `${basePath}/${id}/documents`;
}

/** Path after `/:id` for routes like `/children/5/documents` → `/documents` */
export function applicantPathAfterId(pathname) {
  const m = String(pathname || '').match(/^\/(?:children|colb-brap)\/\d+(.*)$/);
  return m && m[1] ? m[1] : '';
}
