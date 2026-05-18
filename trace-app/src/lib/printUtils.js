/** Long date e.g. APRIL 10, 2026 — from ISO or parseable strings. */
export function formatDateLong(rawDate) {
  if (rawDate == null || rawDate === '') return '';
  const trimmed = String(rawDate).trim();
  if (/^[A-Z]+\s+\d{1,2},\s+\d{4}$/i.test(trimmed)) {
    return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    const yi = Number(isoMatch[1]);
    const mi = Number(isoMatch[2]);
    const di = Number(isoMatch[3]);
    const date = new Date(yi, mi - 1, di);
    if (date.getFullYear() !== yi || date.getMonth() !== mi - 1 || date.getDate() !== di) return '';
    return date
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      .toUpperCase();
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

export function fullName(first, middle, last) {
  return [first, middle, last]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(' ');
}

export function joinCommaParts(...parts) {
  return parts
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(', ');
}
