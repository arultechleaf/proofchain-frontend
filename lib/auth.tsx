'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, session } from './api';
import type { User } from '@/models';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = session.getToken();
    const storedUser = session.getUser<User>();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken, user: userData } = res.data;
    session.save(accessToken, userData);
    setToken(accessToken);
    setUser(userData);
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
      value={{ user, token, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
