import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccountProfile, ApiError, AUTH_STORAGE_KEY, AuthResponse, authApi } from '../services/authApi';

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
}

interface ProfileInput {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

interface AuthContextValue {
  session: AuthResponse | null;
  profile: AccountProfile | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginWithOtp: (challengeId: string, code: string, remember: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string, remember: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<AccountProfile>;
  updateProfile: (input: ProfileInput) => Promise<AccountProfile>;
  updateAvatar: (file: File) => Promise<AccountProfile>;
  deleteAvatar: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): { value: AuthResponse | null; remember: boolean } {
  const local = localStorage.getItem(AUTH_STORAGE_KEY);
  const raw = local || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { value: null, remember: false };
  try {
    const value = JSON.parse(raw) as AuthResponse;
    if (!value.refreshToken || new Date(value.refreshExpiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return { value: null, remember: false };
    }
    return { value, remember: Boolean(local) };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return { value: null, remember: false };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useRef(readSession()).current;
  const [session, setSession] = useState<AuthResponse | null>(initial.value);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(initial.value));
  const rememberRef = useRef(initial.remember);
  const sessionRef = useRef<AuthResponse | null>(initial.value);
  const refreshPromise = useRef<Promise<AuthResponse> | null>(null);

  const persist = useCallback((value: AuthResponse, remember = rememberRef.current) => {
    rememberRef.current = remember;
    sessionRef.current = value;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    (remember ? localStorage : sessionStorage).setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
    setSession(value);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionRef.current = null;
    setSession(null);
    setProfile(null);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) throw new ApiError('Phiên đăng nhập không còn hiệu lực.', 401);
    if (!refreshPromise.current) {
      refreshPromise.current = authApi.refresh(current.refreshToken)
        .then((result) => { persist(result); return result; })
        .catch((error) => { clearSession(); throw error; })
        .finally(() => { refreshPromise.current = null; });
    }
    return refreshPromise.current;
  }, [clearSession, persist]);

  useEffect(() => {
    if (!session) return;
    const delay = Math.max(1_000, new Date(session.expiresAt).getTime() - Date.now() - 60_000);
    const timer = window.setTimeout(() => { void refreshSession().catch(() => undefined); }, delay);
    return () => window.clearTimeout(timer);
  }, [session, refreshSession]);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const active = new Date(session.expiresAt).getTime() > Date.now() + 5_000 ? session : await refreshSession();
        const result = await authApi.getProfile(active.accessToken);
        if (!cancelled) setProfile(result);
      } catch (error) {
        if (!cancelled && error instanceof ApiError && error.status === 401) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [session?.accessToken, clearSession, refreshSession]);

  const requireSession = useCallback(() => {
    const current = sessionRef.current;
    if (!current) throw new ApiError('Phiên đăng nhập không còn hiệu lực.', 401);
    return current;
  }, []);

  const updateSessionIdentity = useCallback((result: AccountProfile) => {
    const current = requireSession();
    persist({ ...current, fullName: result.fullName, email: result.email });
    setProfile(result);
  }, [persist, requireSession]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    loading,
    login: async (email, password, remember) => persist(await authApi.login(email, password, remember), remember),
    loginWithOtp: async (challengeId, code, remember) => persist(await authApi.verifyOtp(challengeId, code, remember), remember),
    loginWithGoogle: async (idToken, remember) => persist(await authApi.google(idToken, remember), remember),
    register: async (input) => persist(await authApi.register(input), true),
    logout: async () => {
      const current = sessionRef.current;
      clearSession();
      if (current) await authApi.logout(current.refreshToken).catch(() => undefined);
    },
    logoutAll: async () => {
      const current = requireSession();
      try { await authApi.logoutAll(current.accessToken); } finally { clearSession(); }
    },
    refreshProfile: async () => {
      const result = await authApi.getProfile(requireSession().accessToken);
      setProfile(result);
      return result;
    },
    updateProfile: async (input) => {
      const result = await authApi.updateProfile(requireSession().accessToken, input);
      updateSessionIdentity(result);
      return result;
    },
    updateAvatar: async (file) => {
      const result = await authApi.uploadAvatar(requireSession().accessToken, file);
      setProfile(result);
      return result;
    },
    deleteAvatar: async () => {
      await authApi.deleteAvatar(requireSession().accessToken);
      setProfile((current) => current ? { ...current, avatarUrl: null, avatarUpdatedAt: null } : current);
    },
    hasRole: (role) => Boolean(session?.roles.includes(role)),
  }), [session, profile, loading, clearSession, persist, requireSession, updateSessionIdentity]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
