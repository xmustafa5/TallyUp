import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth.store';
import { router } from 'expo-router';

const baseURL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken },
          );

          const newAccessToken = data.data.accessToken;
          const newRefreshToken = data.data.refreshToken;
          const user = useAuthStore.getState().user;

          if (user) {
            useAuthStore.getState().setAuth(user, newAccessToken, newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().clearAuth();
          router.replace('/(auth)/login');
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
