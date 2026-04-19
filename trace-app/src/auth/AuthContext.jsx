import { createContext, useContext, useMemo, useState } from 'react';
import {
  clearSession,
  getSessionUser,
  loginWithCredentials,
} from './authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSessionUser());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: (username, password) => {
        const loggedInUser = loginWithCredentials(username, password);
        setUser(loggedInUser);
        return loggedInUser;
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
