const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
