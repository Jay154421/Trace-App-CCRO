import { apiUrl } from '../config/api';

async function request(path, options = {}) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

export const childrenApi = {
  list: () => request('/children'),
  get: (id) => request(`/children/${id}`),
  create: (body) => request('/children', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/children/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/children/${id}`, { method: 'DELETE' }),
  updateChecklist: (id, items) => request(`/children/${id}/checklist`, { method: 'PUT', body: JSON.stringify({ items }) }),
  updateCertificateOfLiveBirth: (id, data) =>
    request(`/children/${id}/certificate-of-live-birth`, { method: 'PUT', body: JSON.stringify(data) }),
};