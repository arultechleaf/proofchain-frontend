'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { authApi, rolesApi, session } from './api';
import { setScreens, type ScreenAccess } from './access';
import { roleLabel } from './utils';
import type { User } from '@/models';
import { WelcomeToast } from '@/components/auth/WelcomeToast';

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
  /** Load the screen list again (after an administrator changes the signed-in user's own access). */
  refreshScreens: () => Promise<void>;
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
  const [loginNotice, setLoginNotice] = useState<{ name: string; role: string; id: number | string; at: number } | null>(null);
  const screenRequests = useRef(new Map<string, Promise<ScreenAccess[]>>());

  const loadScreens = useCallback((accessToken: string) => {
    const pending = screenRequests.current.get(accessToken);
    if (pending) return pending;

    const request = rolesApi.mine().then(
      (res) => res.data.data.screens as ScreenAccess[],
    );
    screenRequests.current.set(accessToken, request);
    const clearRequest = () => {
      if (screenRequests.current.get(accessToken) === request) {
        screenRequests.current.delete(accessToken);
      }
    };
    void request.then(clearRequest, clearRequest);
    return request;
  }, []);

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
    loadScreens(token)
      .then((screens) => { if (!cancelled) setAccess({ token, screens }); })
      .catch(() => { if (!cancelled) setAccess({ token, screens: null }); });
    return () => { cancelled = true; };
  }, [token, loadScreens]);

  // Permissions can change while someone is signed in, so reload the list when the tab gets focus again.
  useEffect(() => {
    if (!token) return;
    const onFocus = () => {
      loadScreens(token)
        .then((screens) => {
          if (session.getToken() === token) setAccess({ token, screens });
        })
        .catch(() => { /* keep the list that is already loaded */ });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, loadScreens]);

  const screens = token && access?.token === token ? access.screens : null;
  const accessLoading = !!token && access?.token !== token;
  useEffect(() => { setScreens(screens); }, [screens]);

  const refreshScreens = async () => {
    if (!token) return;
    try {
      const screens = await loadScreens(token);
      if (session.getToken() === token) setAccess({ token, screens });
    } catch { /* keep the list that is already loaded */ }
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { accessToken, user: userData } = res.data;
    session.save(accessToken, userData);
    setToken(accessToken);
    setUser(userData);
    setLoginNotice({ name: userData.name, role: roleLabel(userData.role), id: userData.id, at: Date.now() });
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
      value={{ user, token, isLoading, isAuthenticated: !!user, screens, accessLoading, login, applySession, refreshScreens, logout }}
    >
      {children}
      {loginNotice && (
        <WelcomeToast
          key={loginNotice.at}
          name={loginNotice.name}
          roleLabel={loginNotice.role}
          userId={loginNotice.id}
          duration={4000}
          onClose={() => setLoginNotice(null)}
        />
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
