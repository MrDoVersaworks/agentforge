'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api, { setAccessToken, getAccessToken } from '@/lib/api';
import type { User } from '@/types';

// ================================================================
// AgentForge — Authentication Context
// Provides user state, login, register, logout, and boot-time
// token refresh for the entire client application tree.
// ================================================================

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch current user profile using the stored access token ──
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/profile');
      const profile = data.data;
      setUser({
        ...profile,
        hasGeminiKey: profile.hasApiKey || profile.has_api_key || false,
      });
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // ── Boot: attempt to silently refresh from httpOnly cookie ──
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        await refreshUser();
      } catch {
        // Not authenticated — that's fine
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, [refreshUser]);

  // ── Login ──
  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post('/auth/login', { email, password });
      setAccessToken(data.data.accessToken);
      await refreshUser();
    },
    [refreshUser]
  );

  // ── Register ──
  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { data } = await api.post('/auth/register', { email, password, name });
      setAccessToken(data.data.accessToken);
      await refreshUser();
    },
    [refreshUser]
  );

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // even if the server call fails, clear client state
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user && !!getAccessToken(),
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
