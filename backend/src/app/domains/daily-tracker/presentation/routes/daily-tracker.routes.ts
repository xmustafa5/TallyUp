import type { FastifyInstance } from 'fastify';
import { PrismaDailyTrackerRepository } from '../../infrastructure/repositories/prisma-daily-tracker.repository';
import { getTodayUTC, shouldUpdateStreak } from '../../domain/services/daily-tracker.service';
import { finalizeTracker } from '../../domain/services/finalization.service';
import {
  getTodaySchema,
  getDateSchema,
  markPrayerSchema,
  finalizeSchema,
  getWeekSchema,
  getStreakSchema,
} from '../schemas/daily-tracker.schemas';

export default async function dailyTrackerRoutes(fastify: FastifyInstance) {
  const repository = new PrismaDailyTrackerRepository(fastify.prisma);

  // All daily tracker routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /daily-tracker/today
  fastify.get('/today', { schema: getTodaySchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const today = getTodayUTC();

    const tracker = await repository.upsert(userId, today, {});

    return reply.send({
      success: true,
      data: tracker.toResponse(),
    });
  });

  // GET /daily-tracker/:date
  fastify.get('/:date', { schema: getDateSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { date } = request.params as { date: string };

    const parsedDate = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      return reply.badRequest('Invalid date format');
    }

    const tracker = await repository.findByUserAndDate(userId, parsedDate);
    if (!tracker) {
      return reply.notFound('No tracker found for this date');
    }

    return reply.send({
      success: true,
      data: tracker.toResponse(),
    });
  });

  // PATCH /daily-tracker/:date
  fastify.patch('/:date', { schema: markPrayerSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { date } = request.params as { date: string };
    const body = request.body as {
      fajr?: boolean;
      dhuhr?: boolean;
      asr?: boolean;
      maghrib?: boolean;
      isha?: boolean;
    };

    const parsedDate = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      return reply.badRequest('Invalid date format');
    }

    // Check if already finalized
    const existing = await repository.findByUserAndDate(userId, parsedDate);
    if (existing?.isFinalized) {
      return reply.badRequest('Cannot update a finalized tracker');
    }

    const tracker = await repository.upsert(userId, parsedDate, body);

    // Update streak if any prayer is marked true
    const hasNewCompletion = Object.values(body).some((v) => v === true);
    if (hasNewCompletion && tracker.getCompletedCount() === 5) {
      const streak = await fastify.prisma.streak.findUnique({
        where: { userId },
      });

      const streakUpdate = shouldUpdateStreak(
        streak?.lastActiveDate ?? null,
        parsedDate,
      );

      if (streakUpdate.increment) {
        const newCurrent = (streak?.currentStreak ?? 0) + 1;
        const newLongest = Math.max(newCurrent, streak?.longestStreak ?? 0);

        await fastify.prisma.streak.upsert({
          where: { userId },
          update: {
            currentStreak: newCurrent,
            longestStreak: newLongest,
            lastActiveDate: parsedDate,
          },
          create: {
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: parsedDate,
          },
        });
      } else if (streakUpdate.reset) {
        await fastify.prisma.streak.upsert({
          where: { userId },
          update: {
            currentStreak: 1,
            longestStreak: Math.max(1, streak?.longestStreak ?? 0),
            lastActiveDate: parsedDate,
          },
          create: {
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: parsedDate,
          },
        });
      }
    }

    return reply.send({
      success: true,
      data: tracker.toResponse(),
    });
  });

  // POST /daily-tracker/:date/finalize
  fastify.post('/:date/finalize', { schema: finalizeSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { date } = request.params as { date: string };

    const parsedDate = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      return reply.badRequest('Invalid date format');
    }

    // Only past dates or today can be finalized
    const today = getTodayUTC();
    if (parsedDate.getTime() > today.getTime()) {
      return reply.badRequest('Cannot finalize a future date');
    }

    const tracker = await repository.findByUserAndDate(userId, parsedDate);
    if (!tracker) {
      return reply.notFound('No tracker found for this date');
    }

    if (tracker.isFinalized) {
      return reply.badRequest('Tracker is already finalized');
    }

    await finalizeTracker(fastify.prisma, tracker);

    // Re-fetch to get updated state
    const finalized = await repository.findByUserAndDate(userId, parsedDate);

    return reply.send({
      success: true,
      data: finalized!.toResponse(),
    });
  });

  // GET /daily-tracker/week
  fastify.get('/week', { schema: getWeekSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const query = request.query as { date?: string };

    let endDate: Date;
    if (query.date) {
      endDate = new Date(query.date + 'T00:00:00.000Z');
      if (isNaN(endDate.getTime())) {
        return reply.badRequest('Invalid date format');
      }
    } else {
      endDate = getTodayUTC();
    }

    // Go back 6 days from end date to get a 7-day range
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 6);

    const trackers = await repository.findByUserAndDateRange(userId, startDate, endDate);

    return reply.send({
      success: true,
      data: trackers.map((t) => t.toResponse()),
    });
  });

  // GET /daily-tracker/streak
  fastify.get('/streak', { schema: getStreakSchema }, async (request, reply) => {
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
