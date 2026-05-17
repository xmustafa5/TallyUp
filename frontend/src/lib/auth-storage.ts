/**
 * Token storage backed by localStorage. Tokens are JS-accessible by
 * design (chosen over the HttpOnly-cookie proxy for simplicity).
 * Guards against SSR access where `window` is undefined.
 */
const ACCESS_KEY = 'tu_access';
const REFRESH_KEY = 'tu_refresh';

function isBrowser() {
  return typeof window !== 'undefined';
}

export const authStorage = {
  getAccess(): string | null {
    return isBrowser() ? window.localStorage.getItem(ACCESS_KEY) : null;
  },
  getRefresh(): string | null {
    return isBrowser() ? window.localStorage.getItem(REFRESH_KEY) : null;
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};
