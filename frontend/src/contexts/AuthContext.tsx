'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api, { setAccessToken, setCsrfToken, getAccessToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthUser(profile: any): User {
  return { ...profile, hasGeminiKey: profile.hasGeminiKey ?? profile.hasApiKey ?? profile.has_api_key ?? false };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  const value = data?.error;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value && typeof (value as { message?: unknown }).message === 'string') return (value as { message: string }).message;
  if (typeof data?.message === 'string') return data.message;
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setUser(mapAuthUser(data.data));
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setCsrfToken(data.data.csrfToken ?? null);
        setAccessToken(data.data.accessToken);
        await refreshUser();
      } catch {
        setUser(null);
        setAccessToken(null);
        setCsrfToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrapAuth();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setCsrfToken(data.data.csrfToken ?? null);
    setAccessToken(data.data.accessToken);
    setUser(mapAuthUser(data.data.user));
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setCsrfToken(data.data.csrfToken ?? null);
    setAccessToken(data.data.accessToken);
    setUser(mapAuthUser(data.data.user));
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    setAccessToken(null);
    setCsrfToken(null);
    setUser(null);
  }, []);

  const value = { user, isLoading, isAuthenticated: !!user && !!getAccessToken(), login, register, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}