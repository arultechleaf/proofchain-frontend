'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, rolesApi, session } from './api';
import { setScreens, type ScreenAccess } from './access';
import type { User } from '@/models';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Screens and the user's access level on each (null until loaded, or if it could not be loaded). */
  screens: ScreenAccess[] | null;
  /** True while the screen list is being fetched after sign-in. */
  accessLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  /** Replace the stored session, for example with the fresh token issued after a password change. */
  applySession: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [access, setAccess] = useState<{ token: string; screens: ScreenAccess[] | null } | null>(null);

  useEffect(() => {
    const storedToken = session.getToken();
    const storedUser = session.getUser<User>();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Load which screens this user may open (from the role_permissions table in MySQL).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    rolesApi.mine()
      .then((res) => { if (!cancelled) setAccess({ token, screens: res.data.data.screens as ScreenAccess[] }); })
      .catch(() => { if (!cancelled) setAccess({ token, screens: null }); });
    return () => { cancelled = true; };
  }, [token]);

  const screens = token && access?.token === token ? access.screens : null;
  const accessLoading = !!token && access?.token !== token;
  useEffect(() => { setScreens(screens); }, [screens]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken, user: userData } = res.data;
    session.save(accessToken, userData);
    setToken(accessToken);
    setUser(userData);
    return userData as User;
  };

  const applySession = (newToken: string, newUser: User) => {
    session.save(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    // Tell the server first, while the token is still attached; the redirect below ends the page anyway.
    try { await authApi.logout(); } catch { /* signing out locally is what matters */ }
    session.clear();
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated: !!user, screens, accessLoading, login, applySession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
