import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            const refreshToken = parsed?.state?.refreshToken;

            if (refreshToken) {
              const { data } = await axios.post(
                `${api.defaults.baseURL}/auth/refresh`,
                { refreshToken },
              );

              const newAccessToken = data.data.accessToken;
              const newRefreshToken = data.data.refreshToken;

              parsed.state.accessToken = newAccessToken;
              parsed.state.refreshToken = newRefreshToken;
              localStorage.setItem('auth-storage', JSON.stringify(parsed));

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return api(originalRequest);
            }
          } catch {
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
