import type { FastifyInstance } from 'fastify';
import { Schedule } from '../../domain/entities/schedule.entity';
import {
  getScheduleSchema,
  upsertScheduleSchema,
  getTodayProgressSchema,
} from '../schemas/schedule.schemas';

export default async function scheduleRoutes(fastify: FastifyInstance) {
  // All schedule routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /schedule
  fastify.get('/', { schema: getScheduleSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const schedule = await fastify.prisma.schedule.upsert({
      where: { userId },
      create: {
        userId,
        dailyGoal: 5,
        weeklyGoal: 35,
      },
      update: {},
    });

    const entity = Schedule.fromPrisma(schedule);

    return reply.send({
      success: true,
      data: entity.toResponse(),
    });
  });

  // PUT /schedule
  fastify.put('/', { schema: upsertScheduleSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = request.body as {
      dailyGoal?: number;
      weeklyGoal?: number;
    };

    const updateData: Record<string, unknown> = {};
    if (body.dailyGoal !== undefined) {
      updateData.dailyGoal = body.dailyGoal;
    }
    if (body.weeklyGoal !== undefined) {
      updateData.weeklyGoal = body.weeklyGoal;
    }

    const schedule = await fastify.prisma.schedule.upsert({
      where: { userId },
      create: {
        userId,
        dailyGoal: body.dailyGoal ?? 5,
        weeklyGoal: body.weeklyGoal ?? 35,
      },
      update: updateData,
    });

    const entity = Schedule.fromPrisma(schedule);

    return reply.send({
      success: true,
      data: entity.toResponse(),
    });
  });

  // GET /schedule/today
  fastify.get('/today', { schema: getTodayProgressSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    // Get or create schedule with defaults
    const schedule = await fastify.prisma.schedule.upsert({
      where: { userId },
      create: {
        userId,
        dailyGoal: 5,
        weeklyGoal: 35,
      },
      update: {},
    });

    // Calculate start of today (UTC)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    // Calculate start of the week (Monday)
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    // Count manually completed makeup prayers logged today (exclude DAILY_MISSED)
    const dailyCompleted = await fastify.prisma.makeupLog.count({
      where: {
        userId,
        source: 'MANUAL',
        completedAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    });

    // Count manually completed makeup prayers logged this week (Mon-Sun)
    const weeklyCompleted = await fastify.prisma.makeupLog.count({
      where: {
        userId,
        source: 'MANUAL',
        completedAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    });

    const dailyPercentage = schedule.dailyGoal > 0
      ? Math.min(100, Math.round((dailyCompleted / schedule.dailyGoal) * 100))
      : 0;

    const weeklyPercentage = schedule.weeklyGoal > 0
      ? Math.min(100, Math.round((weeklyCompleted / schedule.weeklyGoal) * 100))
      : 0;

    return reply.send({
      success: true,
      data: {
        dailyGoal: schedule.dailyGoal,
        dailyCompleted,
        weeklyGoal: schedule.weeklyGoal,
        weeklyCompleted,
        dailyPercentage,
        weeklyPercentage,
      },
    });
  });
}
