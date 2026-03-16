'use server';

import { cookies } from 'next/headers';

const LOCALE_COOKIE = 'locale';
const DEFAULT_LOCALE = 'en';

export async function getUserLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(LOCALE_COOKIE)?.value || DEFAULT_LOCALE;
}

export async function setUserLocale(locale: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale);
}
