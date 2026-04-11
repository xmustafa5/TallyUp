import type { PrismaClient } from '@prisma/client';
import { DailyTracker } from '../entities/daily-tracker.entity';
import { finalizeTracker } from './finalization.service';
import { getTodayUTC } from './daily-tracker.service';

/**
 * Catches up a user's daily-tracker finalization from their last activity
 * up to (but not including) today.
 *
 * This function exists because the nightly cron can only finalize dates
 * that already have a DailyTracker row; users who were entirely offline
 * for a day never created a row, so their missed prayers were silently
 * lost. This fills in zero-prayer rows for every gap day between the
 * user's account creation and yesterday, then finalizes every unfinalized
 * past row (creating MakeupLog entries with source DAILY_MISSED and
 * recalculating the PrayerBalance).
 *
 * It is idempotent: already-finalized rows are skipped, and the UTC date
 * of "today" is never touched.
 */
export async function catchUpUserFinalization(
  prisma: PrismaClient,
  userId: string,
): Promise<{ backfilled: number; finalized: number }> {
  const today = getTodayUTC();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (!user) {
    return { backfilled: 0, finalized: 0 };
  }

  // Earliest date we'll ever touch = the UTC date the account was created
  const accountStart = new Date(
    Date.UTC(
      user.createdAt.getUTCFullYear(),
      user.createdAt.getUTCMonth(),
      user.createdAt.getUTCDate(),
    ),
  );

  // Collect every past-day tracker row this user has so we know which
  // dates we need to backfill.
  const existingPast = await prisma.dailyTracker.findMany({
    where: {
      userId,
      date: { gte: accountStart, lt: today },
    },
    select: { date: true },
  });
  const existingDates = new Set(
    (existingPast as Array<{ date: Date }>).map((r) => r.date.getTime()),
  );

  // Walk day-by-day from accountStart up to (but excluding) today, creating
  // a zero-prayer row for any missing date so finalization can process it.
  let backfilled = 0;
  const cursor = new Date(accountStart);
  while (cursor < today) {
    if (!existingDates.has(cursor.getTime())) {
      await prisma.dailyTracker.create({
        data: {
          userId,
          date: new Date(cursor),
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
          isFinalized: false,
        },
      });
      backfilled++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Now finalize every unfinalized past-day row for this user.
  const unfinalized = await prisma.dailyTracker.findMany({
    where: {
      userId,
      isFinalized: false,
      date: { lt: today },
    },
    orderBy: { date: 'asc' },
  });

  let finalized = 0;
  for (const record of unfinalized) {
    try {
      const tracker = DailyTracker.fromPrisma(record);
      await finalizeTracker(prisma, tracker);
      finalized++;
    } catch {
      // finalizeTracker is best-effort per tracker; swallow and continue
      // so a bad row does not block subsequent days
    }
  }

  return { backfilled, finalized };
}
