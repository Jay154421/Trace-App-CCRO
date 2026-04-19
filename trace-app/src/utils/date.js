/**
 * Format an ISO date string (YYYY-MM-DD) for display as DD-MM-YYYY.
 */
export function formatDateDDMMYYYY(isoDateStr) {
  if (!isoDateStr) return '';
  const [y, m, d] = isoDateStr.split('-');
  if (!d) return isoDateStr;
  return `${d}-${m}-${y}`;
}
