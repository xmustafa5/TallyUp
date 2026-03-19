import type { PrayerType, MakeupSource } from '@prisma/client';

const VALID_PRAYER_TYPES: PrayerType[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

/**
 * Validates and prepares data for logging a makeup prayer.
 * Pure domain logic -- no database or infrastructure dependencies.
 */
export function logMakeupPrayer(data: {
  userId: string;
  prayerType: PrayerType;
  source?: MakeupSource;
  targetDate?: Date;
}): { userId: string; prayerType: PrayerType; source: MakeupSource; targetDate?: Date; completedAt: Date } {
  if (!VALID_PRAYER_TYPES.includes(data.prayerType)) {
    throw new Error(`Invalid prayer type: ${data.prayerType}`);
  }

  return {
    userId: data.userId,
    prayerType: data.prayerType,
    source: data.source ?? 'MANUAL',
    targetDate: data.targetDate,
    completedAt: new Date(),
  };
}

export interface MakeupStats {
  perType: {
    fajr: { completed: number; remaining: number };
    dhuhr: { completed: number; remaining: number };
    asr: { completed: number; remaining: number };
    maghrib: { completed: number; remaining: number };
    isha: { completed: number; remaining: number };
  };
  totalCompleted: number;
  totalRemaining: number;
}

/**
 * Calculates per-type completed and remaining counts.
 * Pure domain logic -- takes pre-fetched data, returns computed stats.
 */
export function getStats(
  completedCounts: Record<string, number>,
  balance: { fajr: number; dhuhr: number; asr: number; maghrib: number; isha: number },
): MakeupStats {
  const fajrCompleted = completedCounts['FAJR'] || 0;
  const dhuhrCompleted = completedCounts['DHUHR'] || 0;
  const asrCompleted = completedCounts['ASR'] || 0;
  const maghribCompleted = completedCounts['MAGHRIB'] || 0;
  const ishaCompleted = completedCounts['ISHA'] || 0;

  const totalCompleted = fajrCompleted + dhuhrCompleted + asrCompleted + maghribCompleted + ishaCompleted;
  const totalRemaining = balance.fajr + balance.dhuhr + balance.asr + balance.maghrib + balance.isha;

  return {
    perType: {
      fajr: { completed: fajrCompleted, remaining: balance.fajr },
      dhuhr: { completed: dhuhrCompleted, remaining: balance.dhuhr },
      asr: { completed: asrCompleted, remaining: balance.asr },
      maghrib: { completed: maghribCompleted, remaining: balance.maghrib },
      isha: { completed: ishaCompleted, remaining: balance.isha },
    },
    totalCompleted,
    totalRemaining,
  };
}
