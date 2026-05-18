import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { authStorage } from '@/lib/auth-storage';

const baseURL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Bare client for the refresh call so it does not recurse.
const refreshClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getAccess();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

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
  // become `{ items, meta }`.
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

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthEndpoint
    ) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api(original);
      }
      authStorage.clear();
    }
    return Promise.reject(error);
  },
);

export default api;
