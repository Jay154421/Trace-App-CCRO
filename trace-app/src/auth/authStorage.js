const SESSION_STORAGE_KEY = 'trace_session';

function readJson(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }
    const parsedValue = JSON.parse(rawValue);
    return parsedValue ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSessionUser() {
  return readJson(SESSION_STORAGE_KEY, null);
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function saveSession(user) {
  writeJson(SESSION_STORAGE_KEY, user);
}