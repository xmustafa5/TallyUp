import type { FastifyInstance } from 'fastify';
import {
  calculateDashboard,
  calculateCalendarMonth,
  getMilestone,
} from '../../domain/services/progress.service';
import {
  getDashboardSchema,
  getCalendarMonthSchema,
  getStreakSchema,
} from '../schemas/progress.schemas';

export default async function progressRoutes(fastify: FastifyInstance) {
  // All progress routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /progress (dashboard)
  fastify.get('/', { schema: getDashboardSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

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
          completedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const dashboard = calculateDashboard(balance, streak, todayTracker, recentMakeupCount);
    const milestone = getMilestone(dashboard.completionPercentage);

    return reply.send({
      success: true,
      data: {
        ...dashboard,
        milestone,
      },
    });
  });

  // GET /progress/calendar/:year/:month
  fastify.get('/calendar/:year/:month', { schema: getCalendarMonthSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { year, month } = request.params as { year: number; month: number };

    // Calculate date range for the month
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [dailyTrackers, makeupLogs] = await Promise.all([
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
    ]);

    const calendarDays = calculateCalendarMonth(dailyTrackers, makeupLogs, year, month);

    return reply.send({
      success: true,
      data: calendarDays,
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
