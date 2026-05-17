import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { authStorage } from '@/lib/auth-storage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Bare client used for the refresh call so it does not recurse through
 * the interceptors below.
 */
const refreshClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request: attach the access token ---------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getAccess();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Response: unwrap envelope + transparent 401 refresh --------------
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authStorage.getRefresh();
  if (!refreshToken) return null;
  try {
    const res = await refreshClient.post('/auth/refresh', { refreshToken });
    const data = res.data?.data as
      | { accessToken: string; refreshToken: string }
      | undefined;
    if (!data) return null;
    authStorage.set(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  // Unwrap the `{ success, data, meta? }` envelope. Paginated responses
  // keep `meta` alongside the array under `.meta`.
  (response: AxiosResponse) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if ('meta' in body) {
        return { ...response, data: { items: body.data, meta: body.meta } };
      }
      return { ...response, data: body.data };
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const isAuthEndpoint = original?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api(original);
      }

      // Refresh failed -> hard logout.
      authStorage.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
