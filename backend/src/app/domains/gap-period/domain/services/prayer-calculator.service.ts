import { DateRange } from '../value-objects/date-range';

const PRAYERS_PER_DAY = 5;

export interface PrayerCalculationResult {
  totalDays: number;
  totalPrayers: number;
  perType: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
  mergedPeriods: Array<{ startDate: Date; endDate: Date; days: number }>;
}

/**
 * Calculate the number of days in a date range (inclusive).
 */
export function calculateDaysInRange(startDate: Date, endDate: Date): number {
  return DateRange.fromDates(startDate, endDate).totalDays;
}

/**
 * Calculate missed prayers for a number of days.
 */
export function calculatePrayersForDays(days: number): number {
  return days * PRAYERS_PER_DAY;
}

/**
 * Convert age range to date range using the user's birthdate.
 */
export function resolveAgesToDates(
  birthdate: Date,
  startAge: number,
  endAge: number,
): { startDate: Date; endDate: Date } {
  const range = DateRange.fromAges(birthdate, startAge, endAge);
  return { startDate: range.startDate, endDate: range.endDate };
}

/**
 * Merge overlapping date ranges into non-overlapping ranges.
 * This is the core deduplication logic that prevents double-counting.
 */
export function mergeOverlappingPeriods(
  periods: Array<{ startDate: Date; endDate: Date }>,
): Array<{ startDate: Date; endDate: Date }> {
  if (periods.length === 0) return [];

  const ranges = periods
    .map((p) => DateRange.fromDates(p.startDate, p.endDate))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const merged: DateRange[] = [ranges[0]];

  for (let i = 1; i < ranges.length; i++) {
    const current = ranges[i];
    const last = merged[merged.length - 1];

    if (last.overlaps(current)) {
      merged[merged.length - 1] = last.merge(current);
    } else {
      merged.push(current);
    }
  }

  return merged.map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
}

/**
 * Calculate total missed prayers across all gap periods,
 * merging overlaps and distributing evenly across prayer types.
 */
export function calculateTotalPrayers(
  periods: Array<{ startDate: Date; endDate: Date }>,
): PrayerCalculationResult {
  const mergedPeriods = mergeOverlappingPeriods(periods);

  const mergedWithDays = mergedPeriods.map((p) => {
    const days = calculateDaysInRange(p.startDate, p.endDate);
    return { startDate: p.startDate, endDate: p.endDate, days };
  });

  const totalDays = mergedWithDays.reduce((sum, p) => sum + p.days, 0);
  const totalPrayers = calculatePrayersForDays(totalDays);

  return {
    totalDays,
    totalPrayers,
    perType: {
      fajr: totalDays,
      dhuhr: totalDays,
      asr: totalDays,
      maghrib: totalDays,
      isha: totalDays,
    },
    mergedPeriods: mergedWithDays,
  };
}
