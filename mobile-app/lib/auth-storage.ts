import * as SecureStore from 'expo-secure-store';

/**
 * Synchronous token storage backed by expo-secure-store (Keychain /
 * Keystore). Works in Expo Go. Tokens are small (well under SecureStore's
 * per-item limit).
 */
const ACCESS_KEY = 'tu_access';
const REFRESH_KEY = 'tu_refresh';

export const authStorage = {
  getAccess(): string | null {
    return SecureStore.getItem(ACCESS_KEY) || null;
  },
  getRefresh(): string | null {
    return SecureStore.getItem(REFRESH_KEY) || null;
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    SecureStore.setItem(ACCESS_KEY, tokens.accessToken);
    SecureStore.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    SecureStore.setItem(ACCESS_KEY, '');
    SecureStore.setItem(REFRESH_KEY, '');
  },
};
