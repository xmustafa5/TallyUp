const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const PRAYER_TYPE_MAP: Record<(typeof PRAYER_KEYS)[number], string> = {
  fajr: 'FAJR',
  dhuhr: 'DHUHR',
  asr: 'ASR',
  maghrib: 'MAGHRIB',
  isha: 'ISHA',
};

/**
 * Returns today's date at midnight UTC (date-only, no time component).
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Determines which prayers were missed based on prayer status flags.
 * Returns an array of PrayerType strings (e.g., ['FAJR', 'ISHA']).
 */
export function determineMissedPrayers(tracker: {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}): string[] {
  const missed: string[] = [];
  for (const key of PRAYER_KEYS) {
    if (!tracker[key]) {
      missed.push(PRAYER_TYPE_MAP[key]);
    }
  }
  return missed;
}

/**
 * Determines whether the streak should be incremented or reset based on
 * the last active date and today's date.
 *
 * - Same day: no change (both false)
 * - Yesterday: increment
 * - Gap > 1 day: reset
 * - No previous activity: increment (first day)
 */
export function shouldUpdateStreak(
  lastActiveDate: Date | null,
  today: Date,
): { increment: boolean; reset: boolean } {
  if (!lastActiveDate) {
    return { increment: true, reset: false };
  }

  const lastUTC = new Date(
    Date.UTC(lastActiveDate.getUTCFullYear(), lastActiveDate.getUTCMonth(), lastActiveDate.getUTCDate()),
  );
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  const diffMs = todayUTC.getTime() - lastUTC.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { increment: false, reset: false };
  }

  if (diffDays === 1) {
    return { increment: true, reset: false };
  }

  // Gap is more than 1 day
  return { increment: false, reset: true };
}
