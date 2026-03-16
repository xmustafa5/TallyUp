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

  const completedCounts = await prisma.makeupLog.groupBy({
    by: ['prayerType'],
    where: { userId },
    _count: true,
  });

  const completed: Record<string, number> = {};
  for (const c of completedCounts) {
    completed[c.prayerType] = c._count;
  }

  const totalCompleted = Object.values(completed).reduce((sum, n) => sum + n, 0);

  const fajr = Math.max(0, calculation.perType.fajr - (completed['FAJR'] || 0));
  const dhuhr = Math.max(0, calculation.perType.dhuhr - (completed['DHUHR'] || 0));
  const asr = Math.max(0, calculation.perType.asr - (completed['ASR'] || 0));
  const maghrib = Math.max(0, calculation.perType.maghrib - (completed['MAGHRIB'] || 0));
  const isha = Math.max(0, calculation.perType.isha - (completed['ISHA'] || 0));
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
