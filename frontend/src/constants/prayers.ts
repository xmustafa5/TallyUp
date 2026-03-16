export const PRAYER_TYPES = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;

export type PrayerType = (typeof PRAYER_TYPES)[number];

export const PRAYER_NAMES: Record<PrayerType, { en: string; ar: string }> = {
  FAJR: { en: 'Fajr', ar: 'الفجر' },
  DHUHR: { en: 'Dhuhr', ar: 'الظهر' },
  ASR: { en: 'Asr', ar: 'العصر' },
  MAGHRIB: { en: 'Maghrib', ar: 'المغرب' },
  ISHA: { en: 'Isha', ar: 'العشاء' },
};

export const PRAYERS_PER_DAY = 5;
