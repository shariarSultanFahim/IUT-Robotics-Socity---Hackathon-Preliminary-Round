'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import {
  refreshTokens,
  setAccessToken,
  setOnAuthCleared,
} from '@/lib/axios';
import type { AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [initializing, setInitializing] = React.useState(true);
  const queryClient = useQueryClient();

  // Refresh-on-load: try to restore a session from the HttpOnly refresh cookie.
  React.useEffect(() => {
    let active = true;
    setOnAuthCleared(() => {
      setUser(null);
      queryClient.clear();
    });

    (async () => {
      try {
        const result = await refreshTokens();
        if (!active) return;
        setAccessToken(result.accessToken);
        setUser(result.user);
      } catch {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) setInitializing(false);
      }
    })();

    return () => {
      active = false;
      setOnAuthCleared(null);
    };
  }, [queryClient]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      setAccessToken(result.accessToken);
      setUser(result.user);
    },
    [],
  );

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear locally regardless
    }
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value: AuthContextValue = {
    user,
    initializing,
    login,
    logout,
    isAdmin: user?.role === 'ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
