import * as SecureStore from 'expo-secure-store';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n';

/**
 * Synchronous locale persistence backed by expo-secure-store, mirroring the
 * auth-storage pattern (SecureStore.getItem/setItem). Works in Expo Go.
 */
const LOCALE_KEY = 'tu_locale';

export const localeStorage = {
  get(): AppLocale | null {
    const v = SecureStore.getItem(LOCALE_KEY) || null;
    return v && (SUPPORTED_LOCALES as readonly string[]).includes(v)
      ? (v as AppLocale)
      : null;
  },
  set(locale: AppLocale) {
    SecureStore.setItem(LOCALE_KEY, locale);
  },
  getOrDefault(): AppLocale {
    return localeStorage.get() ?? DEFAULT_LOCALE;
  },
};
