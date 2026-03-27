export const PRAYER_TYPES = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;

export type PrayerType = (typeof PRAYER_TYPES)[number];

export const PRAYER_NAMES: Record<PrayerType, { en: string; ar: string }> = {
  FAJR: { en: 'Fajr', ar: '\u0627\u0644\u0641\u062C\u0631' },
  DHUHR: { en: 'Dhuhr', ar: '\u0627\u0644\u0638\u0647\u0631' },
  ASR: { en: 'Asr', ar: '\u0627\u0644\u0639\u0635\u0631' },
  MAGHRIB: { en: 'Maghrib', ar: '\u0627\u0644\u0645\u063A\u0631\u0628' },
  ISHA: { en: 'Isha', ar: '\u0627\u0644\u0639\u0634\u0627\u0621' },
};

export const PRAYERS_PER_DAY = 5;
