import type { FastifyInstance } from 'fastify';
import {
  calculateDashboard,
  calculateCalendarMonth,
  getMilestone,
} from '../../domain/services/progress.service';
import { mergeOverlappingPeriods } from '../../../gap-period/domain/services/prayer-calculator.service';
import {
  getDashboardSchema,
  getCalendarMonthSchema,
  getStreakSchema,
} from '../schemas/progress.schemas';
import { CacheService } from '../../../../common/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../common/constants/cache-keys';

export default async function progressRoutes(fastify: FastifyInstance) {
  const cache = new CacheService(fastify.redis);

  // All progress routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /progress (dashboard)
  fastify.get('/', { schema: getDashboardSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    // Try cache first
    const cacheKey = CACHE_KEYS.dashboard(userId);
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return reply.send({ success: true, data: cached });
    }

    // Fetch all data in parallel
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const sevenDaysAgo = new Date(todayUTC);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const [balance, streak, todayTracker, recentMakeupCount] = await Promise.all([
      fastify.prisma.prayerBalance.findUnique({
        where: { userId },
      }),
      fastify.prisma.streak.findUnique({
        where: { userId },
      }),
      fastify.prisma.dailyTracker.findUnique({
        where: { userId_date: { userId, date: todayUTC } },
      }),
      fastify.prisma.makeupLog.count({
        where: {
          userId,
          source: 'MANUAL',
          completedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const dashboard = calculateDashboard(balance, streak, todayTracker, recentMakeupCount);
    const milestone = getMilestone(dashboard.completionPercentage);

    const responseData = {
      ...dashboard,
      milestone,
    };

    // Cache the result
    await cache.set(cacheKey, responseData, CACHE_TTL.dashboard);

    return reply.send({
      success: true,
      data: responseData,
    });
  });

  // GET /progress/calendar/:year/:month
  fastify.get('/calendar/:year/:month', { schema: getCalendarMonthSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { year, month } = request.params as { year: number; month: number };

    // Try cache first
    const cacheKey = CACHE_KEYS.calendar(userId, year, month);
    const cached = await cache.get<unknown[]>(cacheKey);
    if (cached) {
      return reply.send({ success: true, data: cached });
    }

    // Calculate date range for the month
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [dailyTrackers, makeupLogs, allGapPeriods, completedCounts] = await Promise.all([
      fastify.prisma.dailyTracker.findMany({
        where: {
          userId,
          date: { gte: firstDay, lte: lastDay },
        },
      }),
      fastify.prisma.makeupLog.findMany({
        where: {
          userId,
          completedAt: { gte: firstDay, lte: lastDay },
        },
      }),
      // Fetch ALL gap periods (not just this month) for global day ordering
      fastify.prisma.gapPeriod.findMany({
        where: { userId },
        select: { startDate: true, endDate: true },
      }),
      // Count completed makeup prayers per type (MANUAL only)
      fastify.prisma.makeupLog.groupBy({
        by: ['prayerType'],
        where: { userId, source: 'MANUAL' },
        _count: true,
      }),
    ]);

    // Calculate how many full days have been made up
    const completedPerType: Record<string, number> = {};
    for (const c of completedCounts) {
      completedPerType[c.prayerType] = c._count;
    }
    const completedMakeupDays = Math.min(
      completedPerType['FAJR'] ?? 0,
      completedPerType['DHUHR'] ?? 0,
      completedPerType['ASR'] ?? 0,
      completedPerType['MAGHRIB'] ?? 0,
      completedPerType['ISHA'] ?? 0,
    );

    // Merge all gap periods for global ordering
    const allMergedPeriods = mergeOverlappingPeriods(
      allGapPeriods.map((gp) => ({
        startDate: new Date(gp.startDate),
        endDate: new Date(gp.endDate),
      })),
    );

    const calendarDays = calculateCalendarMonth(
      dailyTrackers, makeupLogs, year, month,
      allGapPeriods, completedMakeupDays, allMergedPeriods, completedPerType,
    );

    // Cache the result
    await cache.set(cacheKey, calendarDays, CACHE_TTL.calendar);

    return reply.send({
      success: true,
      data: calendarDays,
    });
  });

  // GET /progress/calendar/day/:date
  // Returns makeup prayer status for a specific gap period day
  fastify.get('/calendar/day/:date', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { date } = request.params as { date: string };

    const parsedDate = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      return reply.badRequest('Invalid date format');
    }

    // Fetch all gap periods and completed counts in parallel
    const [allGapPeriods, completedCounts] = await Promise.all([
      fastify.prisma.gapPeriod.findMany({
        where: { userId },
        select: { startDate: true, endDate: true },
      }),
      fastify.prisma.makeupLog.groupBy({
        by: ['prayerType'],
        where: { userId, source: 'MANUAL' },
        _count: true,
      }),
    ]);

    // Check if this date falls in a gap period
    const isInGapPeriod = allGapPeriods.some((gp) => {
      const start = new Date(gp.startDate).getTime();
      const end = new Date(gp.endDate).getTime();
      return parsedDate.getTime() >= start && parsedDate.getTime() <= end;
    });

    if (!isInGapPeriod) {
      return reply.send({
        success: true,
        data: { date, isGapDay: false, prayers: null, status: 'no-data' },
      });
    }

    // Calculate completed per type
    const completed: Record<string, number> = {};
    for (const c of completedCounts) {
      completed[c.prayerType] = c._count;
    }

    const fajrDone = completed['FAJR'] ?? 0;
    const dhuhrDone = completed['DHUHR'] ?? 0;
    const asrDone = completed['ASR'] ?? 0;
    const maghribDone = completed['MAGHRIB'] ?? 0;
    const ishaDone = completed['ISHA'] ?? 0;

    const completedDays = Math.min(fajrDone, dhuhrDone, asrDone, maghribDone, ishaDone);

    // Merge periods and find this day's position
    const allMergedPeriods = mergeOverlappingPeriods(
      allGapPeriods.map((gp) => ({
        startDate: new Date(gp.startDate),
        endDate: new Date(gp.endDate),
      })),
    );

    // Count gap days before this date
    let dayPosition = 0;
    for (const gp of allMergedPeriods) {
      const start = new Date(gp.startDate).getTime();
      const end = new Date(gp.endDate).getTime();
      const target = parsedDate.getTime();
      if (end < target) {
        dayPosition += Math.floor((end - start) / 86400000) + 1;
      } else if (start <= target) {
        dayPosition += Math.floor((target - start) / 86400000);
        break;
      }
    }

    let status: string;
    let prayers: Record<string, boolean>;

    if (dayPosition < completedDays) {
      // Fully completed day
      status = 'complete';
      prayers = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
    } else if (dayPosition === completedDays) {
      // Current day being worked on -- show partial progress
      prayers = {
        fajr: fajrDone > completedDays,
        dhuhr: dhuhrDone > completedDays,
        asr: asrDone > completedDays,
        maghrib: maghribDone > completedDays,
        isha: ishaDone > completedDays,
      };
      const doneCount = Object.values(prayers).filter(Boolean).length;
      status = doneCount === 5 ? 'complete' : doneCount > 0 ? 'partial' : 'missed';
    } else {
      // Future gap day -- not started
      status = 'missed';
      prayers = { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
    }

    return reply.send({
      success: true,
      data: { date, isGapDay: true, status, prayers, position: dayPosition, completedDays },
    });
  });

  // GET /progress/streaks
  fastify.get('/streaks', { schema: getStreakSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const streak = await fastify.prisma.streak.findUnique({
      where: { userId },
    });

    return reply.send({
      success: true,
      data: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        lastActiveDate: streak?.lastActiveDate
          ? streak.lastActiveDate.toISOString().split('T')[0]
          : null,
      },
    });
  });
}
