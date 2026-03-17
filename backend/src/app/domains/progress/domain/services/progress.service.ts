/**
 * Pure functions for progress data aggregation.
 * No external dependencies -- receives pre-fetched data and returns computed results.
 */

interface PrayerBalance {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  totalRemaining: number;
  totalCompleted: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}

interface TrackerData {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  isFinalized: boolean;
}

interface DashboardResult {
  totalRemaining: number;
  totalCompleted: number;
  completionPercentage: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
  };
  todayStatus: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    completedCount: number;
    isFinalized: boolean;
  };
  recentActivity: number;
}

interface CalendarDay {
  date: string;
  prayedCount: number;
  makeupCount: number;
  isFinalized: boolean;
  status: 'complete' | 'partial' | 'missed' | 'future' | 'no-data';
}

interface DailyTrackerRecord {
  date: Date;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  isFinalized: boolean;
}

interface MakeupLogRecord {
  completedAt: Date;
}

interface GapPeriodRecord {
  startDate: Date;
  endDate: Date;
}

interface MergedPeriod {
  startDate: Date;
  endDate: Date;
}

const MILESTONES = [10, 25, 50, 75, 90, 100];

/**
 * Aggregates pre-fetched data into a dashboard summary.
 */
export function calculateDashboard(
  balance: PrayerBalance | null,
  streak: StreakData | null,
  todayTracker: TrackerData | null,
  recentMakeupCount: number,
): DashboardResult {
  const totalRemaining = balance?.totalRemaining ?? 0;
  const totalCompleted = balance?.totalCompleted ?? 0;
  const total = totalRemaining + totalCompleted;

  const completionPercentage =
    total > 0 ? Math.round((totalCompleted / total) * 1000) / 10 : 0;

  const fajr = todayTracker?.fajr ?? false;
  const dhuhr = todayTracker?.dhuhr ?? false;
  const asr = todayTracker?.asr ?? false;
  const maghrib = todayTracker?.maghrib ?? false;
  const isha = todayTracker?.isha ?? false;

  const completedCount = [fajr, dhuhr, asr, maghrib, isha].filter(Boolean).length;

  return {
    totalRemaining,
    totalCompleted,
    completionPercentage,
    streak: {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastActiveDate: streak?.lastActiveDate
        ? streak.lastActiveDate.toISOString().split('T')[0]
        : null,
    },
    todayStatus: {
      fajr,
      dhuhr,
      asr,
      maghrib,
      isha,
      completedCount,
      isFinalized: todayTracker?.isFinalized ?? false,
    },
    recentActivity: recentMakeupCount,
  };
}

/**
 * Builds a calendar view for a given month, combining daily tracker and makeup log data.
 */
export function calculateCalendarMonth(
  dailyTrackers: DailyTrackerRecord[],
  makeupLogs: MakeupLogRecord[],
  year: number,
  month: number,
  gapPeriods: GapPeriodRecord[] = [],
  completedMakeupDays: number = 0,
  allMergedPeriods: MergedPeriod[] = [],
  completedPerType: Record<string, number> = {},
): CalendarDay[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  // Index trackers by date string for fast lookup
  const trackerMap = new Map<string, DailyTrackerRecord>();
  for (const tracker of dailyTrackers) {
    const dateKey = new Date(tracker.date).toISOString().split('T')[0];
    trackerMap.set(dateKey, tracker);
  }

  // Count makeup logs per day
  const makeupCountMap = new Map<string, number>();
  for (const log of makeupLogs) {
    const dateKey = new Date(log.completedAt).toISOString().split('T')[0];
    makeupCountMap.set(dateKey, (makeupCountMap.get(dateKey) ?? 0) + 1);
  }

  const days: CalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateUTC = new Date(Date.UTC(year, month - 1, day));

    const tracker = trackerMap.get(dateStr);
    const makeupCount = makeupCountMap.get(dateStr) ?? 0;

    let prayedCount = 0;
    let isFinalized = false;
    let status: CalendarDay['status'];

    if (dateUTC.getTime() > todayUTC.getTime()) {
      // Future date
      status = 'future';
      if (tracker) {
        prayedCount = countPrayers(tracker);
        isFinalized = tracker.isFinalized;
      }
    } else {
      // Check if this date falls within a gap period
      const isInGapPeriod = gapPeriods.some((gp) => {
        const start = new Date(gp.startDate).getTime();
        const end = new Date(gp.endDate).getTime();
        const current = dateUTC.getTime();
        return current >= start && current <= end;
      });

      if (tracker) {
        prayedCount = countPrayers(tracker);
        isFinalized = tracker.isFinalized;

        if (isInGapPeriod && dateUTC.getTime() <= todayUTC.getTime()) {
          // Day has both tracker AND is in gap period -- check makeup status too
          const dayPosition = countGapDaysBefore(allMergedPeriods, dateUTC);
          const gapComplete = completedMakeupDays > 0 && dayPosition < completedMakeupDays;
          const dailyComplete = prayedCount === 5;

          if (gapComplete) {
            // Gap period day fully made up -- show as complete
            status = 'complete';
          } else if (dailyComplete || prayedCount > 0) {
            status = 'partial';
          } else {
            status = 'missed';
          }
        } else {
          // Regular day with tracker (not in gap period)
          if (prayedCount === 5) {
            status = 'complete';
          } else if (prayedCount > 0) {
            status = 'partial';
          } else {
            status = 'missed';
          }
        }
      } else if (isInGapPeriod && dateUTC.getTime() <= todayUTC.getTime()) {
        // No tracker, but in gap period
        const dayPosition = countGapDaysBefore(allMergedPeriods, dateUTC);
        if (completedMakeupDays > 0 && dayPosition < completedMakeupDays) {
          status = 'complete';
        } else if (dayPosition === completedMakeupDays) {
          const extraPrayers = Object.values(completedPerType).filter((c) => c > completedMakeupDays).length;
          status = extraPrayers > 0 ? 'partial' : 'missed';
        } else {
          status = 'missed';
        }
      } else {
        status = 'no-data';
      }
    }

    days.push({
      date: dateStr,
      prayedCount,
      makeupCount,
      isFinalized,
      status,
    });
  }

  return days;
}

/**
 * Returns a milestone message if the completion percentage is at a milestone threshold.
 * Returns null if not at a milestone.
 */
export function getMilestone(completionPercentage: number): string | null {
  for (const milestone of MILESTONES) {
    if (completionPercentage >= milestone && completionPercentage < milestone + 1) {
      if (milestone === 100) {
        return 'You have completed 100% of your missed prayers!';
      }
      return `You have completed ${milestone}% of your missed prayers!`;
    }
  }

  // Exact 100% check (completionPercentage === 100)
  if (completionPercentage === 100) {
    return 'You have completed 100% of your missed prayers!';
  }

  return null;
}

const MS_PER_DAY = 86400000;

/**
 * Counts how many gap period days come before a target date (0-indexed).
 * Used to determine if a specific gap day has been "made up" based on
 * the number of completed makeup days (from oldest to newest).
 */
function countGapDaysBefore(mergedPeriods: MergedPeriod[], targetDate: Date): number {
  let count = 0;
  const target = targetDate.getTime();

  for (const gp of mergedPeriods) {
    const start = new Date(gp.startDate).getTime();
    const end = new Date(gp.endDate).getTime();

    if (end < target) {
      // Entire period is before target date
      count += Math.floor((end - start) / MS_PER_DAY) + 1;
    } else if (start <= target) {
      // Target falls within this period -- count days from start to day before target
      count += Math.floor((target - start) / MS_PER_DAY);
      break; // No need to check further periods
    }
    // If start > target, this period is after target -- skip
  }

  return count;
}

function countPrayers(tracker: {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}): number {
  return [tracker.fajr, tracker.dhuhr, tracker.asr, tracker.maghrib, tracker.isha].filter(
    Boolean,
  ).length;
}
