import type { FastifyInstance } from 'fastify';
import type { PrayerType } from '@prisma/client';
import { PrismaDailyTrackerRepository } from '../../infrastructure/repositories/prisma-daily-tracker.repository';
import { getTodayUTC, shouldUpdateStreak } from '../../domain/services/daily-tracker.service';
import { finalizeTracker } from '../../domain/services/finalization.service';
import { catchUpUserFinalization } from '../../domain/services/catch-up.service';
import {
  getTodaySchema,
  getDateSchema,
  markPrayerSchema,
  finalizeSchema,
  getWeekSchema,
  getStreakSchema,
} from '../schemas/daily-tracker.schemas';
import { CacheService } from '../../../../common/services/cache.service';
import { CACHE_KEYS } from '../../../../common/constants/cache-keys';

const PRAYER_FIELD_TO_TYPE: Record<string, PrayerType> = {
  fajr: 'FAJR',
  dhuhr: 'DHUHR',
  asr: 'ASR',
  maghrib: 'MAGHRIB',
  isha: 'ISHA',
};

export default async function dailyTrackerRoutes(fastify: FastifyInstance) {
  const repository = new PrismaDailyTrackerRepository(fastify.prisma);
  const cache = new CacheService(fastify.redis);

  // All daily tracker routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /daily-tracker/today
  fastify.get('/today', { schema: getTodaySchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const today = getTodayUTC();

    // Before returning today's row, finalize any past days the user missed
    // (including days where they never opened the app). This guarantees
    // the UI reflects accumulated qadha debt the moment the app is opened,
    // not only after the nightly cron.
    try {
      await catchUpUserFinalization(fastify.prisma, userId);
    } catch (err) {
      fastify.log.error(
        { err, userId },
        'catchUpUserFinalization failed on /daily-tracker/today',
      );
    }

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

    const tracker = await repository.upsert(userId, parsedDate, body);

    // Sync with makeup logs if this date is in a gap period
    const gapPeriods = await fastify.prisma.gapPeriod.findMany({
      where: { userId },
      select: { startDate: true, endDate: true },
    });
    const isInGapPeriod = gapPeriods.some((gp) => {
      const start = new Date(gp.startDate).getTime();
      const end = new Date(gp.endDate).getTime();
      return parsedDate.getTime() >= start && parsedDate.getTime() <= end;
    });

    if (isInGapPeriod) {
      for (const [field, value] of Object.entries(body)) {
        const prayerType = PRAYER_FIELD_TO_TYPE[field];
        if (!prayerType) continue;

        if (value === true) {
          // Add makeup log if not exists
          const exists = await fastify.prisma.makeupLog.findFirst({
            where: { userId, prayerType, targetDate: parsedDate },
          });
          if (!exists) {
            await fastify.prisma.makeupLog.create({
              data: { userId, prayerType, source: 'MANUAL', targetDate: parsedDate, completedAt: new Date() },
            });
          }
        } else if (value === false) {
          // Remove makeup log if exists
          await fastify.prisma.makeupLog.deleteMany({
            where: { userId, prayerType, targetDate: parsedDate },
          });
        }
      }
      // Invalidate makeup caches
      await cache.invalidateExact(
        CACHE_KEYS.balance(userId),
        CACHE_KEYS.makeupStats(userId),
      );
      await cache.invalidate(`calendar:${userId}:*`);
    }

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

    // Invalidate dashboard cache after marking prayers
    await cache.invalidateExact(CACHE_KEYS.dashboard(userId));

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

    // Invalidate all relevant caches after finalization
    await cache.invalidateExact(
      CACHE_KEYS.dashboard(userId),
      CACHE_KEYS.balance(userId),
      CACHE_KEYS.makeupStats(userId),
    );
    await cache.invalidate(`calendar:${userId}:*`);

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
