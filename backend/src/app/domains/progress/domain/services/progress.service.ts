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
 * Builds a calendar view for a given month using targetDate-based makeup tracking.
 * makeupPerDay: Map of date string -> count of qadha prayers logged for that gap day
 */
export function calculateCalendarMonth(
  dailyTrackers: DailyTrackerRecord[],
  makeupLogs: MakeupLogRecord[],
  year: number,
  month: number,
  gapPeriods: GapPeriodRecord[] = [],
  makeupPerDay: Map<string, number> = new Map(),
): CalendarDay[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  // Index trackers by date string
  const trackerMap = new Map<string, DailyTrackerRecord>();
  for (const tracker of dailyTrackers) {
    const dateKey = new Date(tracker.date).toISOString().split('T')[0];
    trackerMap.set(dateKey, tracker);
  }

  // Count makeup logs by completedAt date (for display purposes)
  const makeupLogCountMap = new Map<string, number>();
  for (const log of makeupLogs) {
    const dateKey = new Date(log.completedAt).toISOString().split('T')[0];
    makeupLogCountMap.set(dateKey, (makeupLogCountMap.get(dateKey) ?? 0) + 1);
  }

  const days: CalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateUTC = new Date(Date.UTC(year, month - 1, day));

    const tracker = trackerMap.get(dateStr);
    const makeupCount = makeupLogCountMap.get(dateStr) ?? 0;
    const isToday = dateUTC.getTime() === todayUTC.getTime();

    let prayedCount = 0;
    let isFinalized = false;
    let status: CalendarDay['status'];

    if (dateUTC.getTime() > todayUTC.getTime()) {
      status = 'future';
      if (tracker) {
        prayedCount = countPrayers(tracker);
        isFinalized = tracker.isFinalized;
      }
    } else {
      const isInGapPeriod = gapPeriods.some((gp) => {
        const start = new Date(gp.startDate).getTime();
        const end = new Date(gp.endDate).getTime();
        return dateUTC.getTime() >= start && dateUTC.getTime() <= end;
      });

      if (tracker) {
        prayedCount = countPrayers(tracker);
        isFinalized = tracker.isFinalized;
      }

      if (isInGapPeriod && !isToday) {
        // Past gap day -- status based on qadha completion for this specific day
        const qadhaForDay = makeupPerDay.get(dateStr) ?? 0;
        if (qadhaForDay >= 5) {
          status = 'complete';
        } else if (qadhaForDay > 0) {
          status = 'partial';
        } else {
          status = 'missed';
        }
      } else if (isInGapPeriod && isToday) {
        // Today is in gap period -- check qadha completion too
        const qadhaForDay = makeupPerDay.get(dateStr) ?? 0;
        if (qadhaForDay >= 5) {
          status = 'complete';
        } else if (qadhaForDay > 0 || prayedCount > 0) {
          status = 'partial';
        } else {
          status = 'no-data';
        }
      } else if (tracker) {
        // Regular day with tracker
        if (prayedCount === 5) {
          status = 'complete';
        } else if (prayedCount > 0) {
          status = 'partial';
        } else if (isToday && !isFinalized) {
          status = 'no-data';
        } else {
          status = 'missed';
        }
      } else {
        status = 'no-data';
      }
    }

    days.push({ date: dateStr, prayedCount, makeupCount, isFinalized, status });
  }

  return days;
}

/**
 * Returns a milestone message if the completion percentage is at a milestone threshold.
 */
export function getMilestone(completionPercentage: number): string | null {
  for (const milestone of MILESTONES) {
    if (completionPercentage >= milestone && completionPercentage < milestone + 1) {
      return `You have completed ${milestone}% of your missed prayers!`;
    }
  }
  if (completionPercentage === 100) {
    return 'You have completed 100% of your missed prayers!';
  }
  return null;
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
