import type { FastifyInstance } from 'fastify';
import type { PrayerType } from '@prisma/client';
import { PrismaMakeupLogRepository } from '../../infrastructure/repositories/prisma-makeup-log.repository';
import { logMakeupPrayer, getStats } from '../../domain/services/makeup.service';
import { recalculateBalance } from '../../../gap-period/domain/services/balance-recalculation.service';
import {
  logMakeupSchema,
  undoMakeupSchema,
  listMakeupHistorySchema,
  getMakeupStatsSchema,
} from '../schemas/makeup.schemas';
import { CacheService } from '../../../../common/services/cache.service';
import { CACHE_KEYS } from '../../../../common/constants/cache-keys';

export default async function makeupRoutes(fastify: FastifyInstance) {
  const repository = new PrismaMakeupLogRepository(fastify.prisma);
  const cache = new CacheService(fastify.redis);

  // All makeup routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /makeup
  fastify.post('/', { schema: logMakeupSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = request.body as { prayerType: PrayerType };

    const createData = logMakeupPrayer({
      userId,
      prayerType: body.prayerType,
    });

    const makeupLog = await repository.create(createData);
    await recalculateBalance(fastify.prisma, userId);

    // Invalidate caches after mutation
    await cache.invalidateExact(
      CACHE_KEYS.dashboard(userId),
      CACHE_KEYS.balance(userId),
      CACHE_KEYS.makeupStats(userId),
    );

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

    await repository.delete(id);
    await recalculateBalance(fastify.prisma, userId);

    // Invalidate caches after mutation
    await cache.invalidateExact(
      CACHE_KEYS.dashboard(userId),
      CACHE_KEYS.balance(userId),
      CACHE_KEYS.makeupStats(userId),
    );

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
