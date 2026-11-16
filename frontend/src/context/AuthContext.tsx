import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tokenStore, UNAUTHORIZED_EVENT } from '../services/api';
import { fetchCurrentAdmin, login as loginRequest } from '../services/certificateService';
import type { Admin } from '../types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  admin: Admin | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [status, setStatus] = useState<Status>(() => (tokenStore.get() ? 'loading' : 'anonymous'));

  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    fetchCurrentAdmin()
      .then((a) => {
        if (cancelled) return;
        setAdmin(a);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setAdmin(null);
      setStatus('anonymous');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, admin: a } = await loginRequest(email, password);
    tokenStore.set(token);
    setAdmin(a);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setAdmin(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ admin, status, login, logout }), [admin, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
