import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccountProfile, ApiError, AuthResponse, authApi } from '../services/authApi';

const STORAGE_KEY = 'stayluxe.auth';

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
}

interface AuthContextValue {
  session: AuthResponse | null;
  profile: AccountProfile | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  updateProfile: (input: { fullName: string; phone: string; dateOfBirth: string }) => Promise<AccountProfile>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): AuthResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthResponse;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthResponse | null>(() => readSession());
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(session));

  const persist = (value: AuthResponse, remember: boolean) => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(value));
    setSession(value);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    authApi.getProfile(session.accessToken)
      .then(setProfile)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    loading,
    login: async (email, password, remember) => {
      const result = await authApi.login(email, password);
      persist(result, remember);
    },
    register: async (input) => {
      const result = await authApi.register(input);
      persist(result, true);
    },
    logout,
    updateProfile: async (input) => {
      if (!session) throw new ApiError('Phiên đăng nhập không còn hiệu lực.', 401);
      const result = await authApi.updateProfile(session.accessToken, input);
      setProfile(result);
      const updated = { ...session, fullName: result.fullName };
      setSession(updated);
      const storage = localStorage.getItem(STORAGE_KEY) ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return result;
    },
    hasRole: (role) => Boolean(session?.roles.includes(role)),
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
