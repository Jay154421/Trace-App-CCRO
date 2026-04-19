const USERS_STORAGE_KEY = 'trace_users';
const SESSION_STORAGE_KEY = 'trace_session';

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'ccro123',
};

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

function ensureDefaultUsers() {
  const users = readJson(USERS_STORAGE_KEY, []);
  if (Array.isArray(users) && users.length > 0) {
    return users;
  }

  writeJson(USERS_STORAGE_KEY, [DEFAULT_ADMIN]);
  return [DEFAULT_ADMIN];
}

export function loginWithCredentials(username, password) {
  const users = ensureDefaultUsers();
  const user = users.find(
    (entry) => entry.username === username && entry.password === password
  );

  if (!user) {
    return null;
  }

  const sessionUser = { username: user.username };
  writeJson(SESSION_STORAGE_KEY, sessionUser);
  return sessionUser;
}

export function getSessionUser() {
  ensureDefaultUsers();
  return readJson(SESSION_STORAGE_KEY, null);
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
