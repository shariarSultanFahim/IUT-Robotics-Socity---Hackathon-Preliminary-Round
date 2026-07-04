import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import type { AuthUser } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Access token is kept ONLY in memory (never localStorage). The refresh token
// lives in an HttpOnly cookie managed by the backend.
let accessToken: string | null = null;
let onAuthCleared: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function setOnAuthCleared(cb: (() => void) | null): void {
  onAuthCleared = cb;
}

/** Interceptor-free client used for the refresh call (avoids recursion). */
const bare = axios.create({ baseURL: API_URL, withCredentials: true });

/** Main API client with auth + refresh handling. */
export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

export interface RefreshResult {
  accessToken: string;
  user: AuthUser;
}

// Single-flight: at most one refresh request in progress.
let refreshPromise: Promise<RefreshResult> | null = null;

export async function refreshTokens(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = bare
      .post<RefreshResult>('/api/auth/refresh')
      .then((res) => res.data)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthRoute =
      url.includes('/api/auth/login') || url.includes('/api/auth/refresh');

    if (status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        const result = await refreshTokens();
        setAccessToken(result.accessToken);
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${result.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        onAuthCleared?.();
      }
    }
    return Promise.reject(error);
  },
);
