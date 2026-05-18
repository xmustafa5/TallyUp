import { I18n, type TranslateOptions } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en';

/**
 * Shared i18n-js instance. Seeded from the device locale (first match in
 * SUPPORTED_LOCALES); falls back to English. The persisted user choice is
 * applied on top of this at startup by the i18n hook / root layout.
 */
export const i18n = new I18n(
  { en, ar },
  {
    defaultLocale: DEFAULT_LOCALE,
    enableFallback: true,
    missingBehavior: 'message',
  },
);

/**
 * Arabic plural rule (CLDR): zero / one / two / few (3-10) / many (11-99) /
 * other. i18n-js defaults to the English (one/other) rule, which is wrong
 * for Arabic count strings, so register the correct categories.
 */
i18n.pluralization.register('ar', (_i18n, count) => {
  const n = Math.abs(count);
  const mod100 = n % 100;
  if (n === 0) return ['zero', 'other'];
  if (n === 1) return ['one', 'other'];
  if (n === 2) return ['two', 'other'];
  if (mod100 >= 3 && mod100 <= 10) return ['few', 'other'];
  if (mod100 >= 11 && mod100 <= 99) return ['many', 'other'];
  return ['other'];
});

function deviceLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES as readonly string[]).includes(code)
    ? (code as AppLocale)
    : DEFAULT_LOCALE;
}

i18n.locale = deviceLocale();

export function t(key: string, options?: TranslateOptions): string {
  return i18n.t(key, options);
}
