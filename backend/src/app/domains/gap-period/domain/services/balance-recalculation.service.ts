import type { PrismaClient } from '@prisma/client';
import { calculateTotalPrayers } from './prayer-calculator.service';

/**
 * Recalculates the user's prayer balance from scratch based on all gap periods
 * and completed makeup prayers. Called whenever gap periods change.
 */
export async function recalculateBalance(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const gapPeriods = await prisma.gapPeriod.findMany({
    where: { userId },
    select: { startDate: true, endDate: true },
  });

  const calculation = calculateTotalPrayers(
    gapPeriods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })),
  );

  // Count completed makeup prayers (MANUAL source = user completed a qadha prayer)
  const completedCounts = await prisma.makeupLog.groupBy({
    by: ['prayerType'],
    where: { userId, source: 'MANUAL' },
    _count: true,
  });

  const completed: Record<string, number> = {};
  for (const c of completedCounts) {
    completed[c.prayerType] = c._count;
  }

  // Count daily missed prayers (DAILY_MISSED source = new missed prayers from daily tracker)
  const missedCounts = await prisma.makeupLog.groupBy({
    by: ['prayerType'],
    where: { userId, source: 'DAILY_MISSED' },
    _count: true,
  });

  const missed: Record<string, number> = {};
  for (const m of missedCounts) {
    missed[m.prayerType] = m._count;
  }

  const totalCompleted = Object.values(completed).reduce((sum, n) => sum + n, 0);

  // Balance = (gap period total + daily missed) - completed makeups
  const fajr = Math.max(0, calculation.perType.fajr + (missed['FAJR'] || 0) - (completed['FAJR'] || 0));
  const dhuhr = Math.max(0, calculation.perType.dhuhr + (missed['DHUHR'] || 0) - (completed['DHUHR'] || 0));
  const asr = Math.max(0, calculation.perType.asr + (missed['ASR'] || 0) - (completed['ASR'] || 0));
  const maghrib = Math.max(0, calculation.perType.maghrib + (missed['MAGHRIB'] || 0) - (completed['MAGHRIB'] || 0));
  const isha = Math.max(0, calculation.perType.isha + (missed['ISHA'] || 0) - (completed['ISHA'] || 0));
  const totalRemaining = fajr + dhuhr + asr + maghrib + isha;

  await prisma.prayerBalance.upsert({
    where: { userId },
    update: {
      fajr,
      dhuhr,
      asr,
      maghrib,
      isha,
      totalRemaining,
      totalCompleted,
    },
    create: {
      userId,
      fajr,
      dhuhr,
      asr,
      maghrib,
      isha,
      totalRemaining,
      totalCompleted,
    },
  });
}
