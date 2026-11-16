import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'certivault.session';

/** JWT storage. Wrapped in try/catch because storage can be unavailable (private mode). */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const UNAUTHORIZED_EVENT = 'certivault:unauthorized';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (err.response?.data?.error?.message) return err.response.data.error.message;
    if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (!err.response) return 'Cannot reach the CertiVault server. Check your connection.';
  }
  return fallback;
}

export function getFieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(err)) return err.response?.data?.error?.fields ?? {};
  return {};
}

export function getErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError<ApiErrorBody>(err)) return err.response?.data?.error?.code;
  return undefined;
}
