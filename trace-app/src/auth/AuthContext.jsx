import { createContext, useContext, useMemo, useState } from 'react';
import {
  clearSession,
  getSessionUser,
  saveSession,
} from './authStorage';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSessionUser());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (username, password) => {
        const data = await authApi.login(username, password);
        if (!data.user) {
          return null;
        }
        saveSession(data.user);
        setUser(data.user);
        return data.user;
      },
      logout: () => {
        clearSession();
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
