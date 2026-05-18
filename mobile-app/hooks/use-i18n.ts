import { useCallback, useSyncExternalStore } from 'react';
import { I18nManager } from 'react-native';
import type { TranslateOptions } from 'i18n-js';
import { i18n, type AppLocale } from '@/lib/i18n';
import { localeStorage } from '@/lib/locale-storage';

/**
 * Tiny external store so every component using the hook re-renders when the
 * locale changes (i18n-js itself is not reactive).
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): string {
  return i18n.locale;
}

function applyLocale(locale: AppLocale) {
  i18n.locale = locale;
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(locale === 'ar');
  listeners.forEach((l) => l());
}

/**
 * Applies the persisted locale (or device default) to i18n + I18nManager.
 * Call once at app startup before the first render of localized screens.
 */
export function bootstrapLocale(): AppLocale {
  const locale = localeStorage.getOrDefault();
  applyLocale(locale);
  return locale;
}

export function useI18n() {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  ) as AppLocale;

  const t = useCallback(
    (key: string, options?: TranslateOptions) => i18n.t(key, options),
    // i18n.locale changes are tracked via the external store snapshot.
    [locale],
  );

  const setLocale = useCallback((next: AppLocale) => {
    localeStorage.set(next);
    applyLocale(next);
  }, []);

  return { t, locale, isRTL: locale === 'ar', setLocale };
}
