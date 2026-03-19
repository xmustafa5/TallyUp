import type { FastifyInstance } from 'fastify';
import type { PrayerType } from '@prisma/client';
import { PrismaMakeupLogRepository } from '../../infrastructure/repositories/prisma-makeup-log.repository';
import { logMakeupPrayer, getStats } from '../../domain/services/makeup.service';
import { recalculateBalance } from '../../../gap-period/domain/services/balance-recalculation.service';
import { mergeOverlappingPeriods } from '../../../gap-period/domain/services/prayer-calculator.service';
import {
  logMakeupSchema,
  undoMakeupSchema,
  listMakeupHistorySchema,
  getMakeupStatsSchema,
} from '../schemas/makeup.schemas';
import { CacheService } from '../../../../common/services/cache.service';
import { CACHE_KEYS } from '../../../../common/constants/cache-keys';

async function findNextIncompleteGapDay(
  prisma: import('@prisma/client').PrismaClient,
  userId: string,
  prayerType: PrayerType,
): Promise<Date | undefined> {
  const allGapPeriods = await prisma.gapPeriod.findMany({
    where: { userId },
    select: { startDate: true, endDate: true },
  });
  if (allGapPeriods.length === 0) return undefined;

  const merged = mergeOverlappingPeriods(
    allGapPeriods.map((gp) => ({ startDate: new Date(gp.startDate), endDate: new Date(gp.endDate) })),
  );

  // Get all targetDates already logged for this prayer type
  const logged = await prisma.makeupLog.findMany({
    where: { userId, prayerType, targetDate: { not: null } },
    select: { targetDate: true },
  });
  const loggedDates = new Set(logged.map((l) => l.targetDate!.toISOString().split('T')[0]));

  // Find first gap day without this prayer type logged
  for (const period of merged) {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!loggedDates.has(dateStr)) {
        return new Date(d);
      }
    }
  }
  return undefined;
}

export default async function makeupRoutes(fastify: FastifyInstance) {
  const repository = new PrismaMakeupLogRepository(fastify.prisma);
  const cache = new CacheService(fastify.redis);

  // All makeup routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /makeup -- Quick Log (auto-assigns to next incomplete gap day)
  fastify.post('/', { schema: logMakeupSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = request.body as { prayerType: PrayerType };

    const targetDate = await findNextIncompleteGapDay(fastify.prisma, userId, body.prayerType);

    const createData = logMakeupPrayer({
      userId,
      prayerType: body.prayerType,
      targetDate,
    });

    const makeupLog = await repository.create(createData);
    await recalculateBalance(fastify.prisma, userId);

    await cache.invalidateExact(
      CACHE_KEYS.dashboard(userId),
      CACHE_KEYS.balance(userId),
      CACHE_KEYS.makeupStats(userId),
    );
    await cache.invalidate(`calendar:${userId}:*`);

    return reply.code(201).send({
      success: true,
      data: makeupLog.toResponse(),
    });
  });

  // POST /makeup/day/:date -- Log qadha for a SPECIFIC gap day
  fastify.post('/day/:date', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { date } = request.params as { date: string };
    const body = request.body as { prayerType: PrayerType };

    const parsedDate = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsedDate.getTime())) {
      return reply.badRequest('Invalid date format');
    }

    // Validate date is within a gap period
    const gapPeriods = await fastify.prisma.gapPeriod.findMany({
      where: { userId },
      select: { startDate: true, endDate: true },
    });
    const isInGap = gapPeriods.some((gp) => {
      const start = new Date(gp.startDate).getTime();
      const end = new Date(gp.endDate).getTime();
      return parsedDate.getTime() >= start && parsedDate.getTime() <= end;
    });
    if (!isInGap) {
      return reply.badRequest('Date is not within a gap period');
    }

    // Check if already logged for this day + prayer type
    const existing = await fastify.prisma.makeupLog.findFirst({
      where: { userId, prayerType: body.prayerType, targetDate: parsedDate },
    });
    if (existing) {
      return reply.badRequest('Prayer already logged for this day');
    }

    const createData = logMakeupPrayer({
      userId,
      prayerType: body.prayerType,
      targetDate: parsedDate,
    });

    const makeupLog = await repository.create(createData);
    await recalculateBalance(fastify.prisma, userId);

    // Sync with daily tracker: mark the prayer for this date
    const prayerField = body.prayerType.toLowerCase();
    await fastify.prisma.dailyTracker.upsert({
      where: { userId_date: { userId, date: parsedDate } },
      update: { [prayerField]: true },
      create: { userId, date: parsedDate, [prayerField]: true },
    });

    await cache.invalidateExact(
      CACHE_KEYS.dashboard(userId),
      CACHE_KEYS.balance(userId),
      CACHE_KEYS.makeupStats(userId),
    );
    await cache.invalidate(`calendar:${userId}:*`);

    return reply.code(201).send({
      success: true,
      data: makeupLog.toResponse(),
    });
  });

  // DELETE /makeup/:id
  fastify.delete('/:id', { schema: undoMakeupSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await repository.findById(id);
    if (!existing) {
      return reply.notFound('Makeup log not found');
    }
    if (existing.userId !== userId) {
      return reply.notFound('Makeup log not found');
    }

    // Sync with daily tracker: unmark the prayer for this date
    if (existing.targetDate) {
      const prayerField = existing.prayerType.toLowerCase();
      const tracker = await fastify.prisma.dailyTracker.findUnique({
        where: { userId_date: { userId, date: existing.targetDate } },
      });
      if (tracker) {
        await fastify.prisma.dailyTracker.update({
          where: { userId_date: { userId, date: existing.targetDate } },
          data: { [prayerField]: false },
        });
      }
    }

    await repository.delete(id);
    await recalculateBalance(fastify.prisma, userId);

    await cache.invalidateExact(
      CACHE_KEYS.dashboard(userId),
      CACHE_KEYS.balance(userId),
      CACHE_KEYS.makeupStats(userId),
    );
    await cache.invalidate(`calendar:${userId}:*`);

    return reply.send({
      success: true,
      message: 'Makeup log deleted successfully',
    });
  });

  // GET /makeup/history
  fastify.get('/history', { schema: listMakeupHistorySchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const query = request.query as {
      prayerType?: PrayerType;
      limit?: number;
      offset?: number;
    };

    const logs = await repository.findByUserId(userId, {
      prayerType: query.prayerType,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    return reply.send({
      success: true,
      data: logs.map((log) => log.toResponse()),
    });
  });

  // GET /makeup/stats
  fastify.get('/stats', { schema: getMakeupStatsSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const completedCounts = await repository.countByUserIdAndType(userId);

    const balance = await fastify.prisma.prayerBalance.findUnique({
      where: { userId },
    });

    const stats = getStats(completedCounts, {
      fajr: balance?.fajr ?? 0,
      dhuhr: balance?.dhuhr ?? 0,
      asr: balance?.asr ?? 0,
      maghrib: balance?.maghrib ?? 0,
      isha: balance?.isha ?? 0,
    });

    return reply.send({
      success: true,
      data: stats,
    });
  });
}
