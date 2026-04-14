import { apiUrl } from '../config/api';

function errorFromResponse(data, fallback) {
  return data?.error || fallback || 'Request failed';
}

export async function fetchDatabaseInfo() {
  const res = await fetch(apiUrl('/database/info'));
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(errorFromResponse(data, res.statusText));
  return data;
}

export async function exportDatabaseFile() {
  const res = await fetch(apiUrl('/database/export'));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(errorFromResponse(data, res.statusText));
  }
  return res.blob();
}

export async function importDatabaseFile(file) {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(apiUrl('/database/import'), {
    method: 'POST',
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorFromResponse(data, res.statusText));
  return data;
}
