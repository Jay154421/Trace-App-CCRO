import { apiUrl } from '../config/api';

async function request(path, options = {}) {
  const url = apiUrl(path);
  const { headers: headerOverrides, ...fetchOptions } = options;
  const headers = { ...headerOverrides };
  if (
    fetchOptions.body != null &&
    fetchOptions.body !== '' &&
    !headers['Content-Type'] &&
    !headers['content-type']
  ) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...fetchOptions,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

export const authApi = {
  hasUsers: () => request('/auth/has-users'),
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};

export const childrenApi = {
  list: () => request('/children'),
  get: (id) => request(`/children/${id}`),
  create: (body) => request('/children', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/children/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/children/${id}`, { method: 'DELETE' }),
  updateChecklist: (id, items) => request(`/children/${id}/checklist`, { method: 'PUT', body: JSON.stringify({ items }) }),
  updateCertificateOfLiveBirth: (id, data) =>
    request(`/children/${id}/certificate-of-live-birth`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePaternityAffidavit: (id, data) =>
    request(`/children/${id}/paternity-affidavit`, { method: 'PUT', body: JSON.stringify(data) }),
  updateDelayedRegistrationAffidavit: (id, data) =>
    request(`/children/${id}/delayed-registration-affidavit`, { method: 'PUT', body: JSON.stringify(data) }),
  updateWitnessAffidavit: (id, data) =>
    request(`/children/${id}/witness-affidavit`, { method: 'PUT', body: JSON.stringify(data) }),
  updateOutOfTownAffidavit: (id, data) =>
    request(`/children/${id}/out-of-town-affidavit`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMuslimAttachment: (id, data) =>
    request(`/children/${id}/muslim-attachment`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStaffProcessStatus: (id, staff_process_status) =>
    request(`/children/${id}/staff-process-status`, {
      method: 'PUT',
      body: JSON.stringify({ staff_process_status }),
    }),
};