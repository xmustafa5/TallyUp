import type { PrismaClient, PrayerType } from '@prisma/client';
import type { DailyTracker } from '../entities/daily-tracker.entity';
import { recalculateBalance } from '../../../gap-period/domain/services/balance-recalculation.service';
import { shouldUpdateStreak } from './daily-tracker.service';

/**
 * Finalizes a daily tracker entry:
 * 1. Creates MakeupLog entries for each missed prayer (source = DAILY_MISSED)
 * 2. Marks the tracker as finalized
 * 3. Recalculates the user's prayer balance
 * 4. Updates the user's streak
 */
export async function finalizeTracker(
  prisma: PrismaClient,
  tracker: DailyTracker,
): Promise<void> {
  const missedPrayers = tracker.getMissedPrayers();

  // Create MakeupLog entries for missed prayers
  if (missedPrayers.length > 0) {
    await prisma.makeupLog.createMany({
      data: missedPrayers.map((prayerType) => ({
        userId: tracker.userId,
        prayerType: prayerType as PrayerType,
        source: 'DAILY_MISSED' as const,
        completedAt: tracker.date,
      })),
    });
  }

  // Mark tracker as finalized
  await prisma.dailyTracker.update({
    where: { id: tracker.id },
    data: { isFinalized: true },
  });

  // Recalculate the user's prayer balance
  await recalculateBalance(prisma, tracker.userId);

  // Update streak
  const streak = await prisma.streak.findUnique({
    where: { userId: tracker.userId },
  });

  const completedCount = tracker.getCompletedCount();
  const today = tracker.date;

  if (completedCount === 5) {
    // All prayers completed -- update streak
    const streakUpdate = shouldUpdateStreak(
      streak?.lastActiveDate ?? null,
      today,
    );

    if (streakUpdate.increment) {
      const newCurrent = (streak?.currentStreak ?? 0) + 1;
      const newLongest = Math.max(newCurrent, streak?.longestStreak ?? 0);

      await prisma.streak.upsert({
        where: { userId: tracker.userId },
        update: {
          currentStreak: newCurrent,
          longestStreak: newLongest,
          lastActiveDate: today,
        },
        create: {
          userId: tracker.userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      });
    } else if (streakUpdate.reset) {
      await prisma.streak.upsert({
        where: { userId: tracker.userId },
        update: {
          currentStreak: 1,
          longestStreak: Math.max(1, streak?.longestStreak ?? 0),
          lastActiveDate: today,
        },
        create: {
          userId: tracker.userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      });
    }
  } else {
    // Not all prayers completed -- reset streak
    if (streak) {
      await prisma.streak.update({
        where: { userId: tracker.userId },
        data: {
          currentStreak: 0,
          lastActiveDate: today,
        },
      });
    } else {
      await prisma.streak.create({
        data: {
          userId: tracker.userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: today,
        },
      });
    }
  }
}
