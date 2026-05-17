import fp from 'fastify-plugin';
import { Worker } from 'bullmq';
import { processCycleEnd } from '../domains/cycles/domain/services/cycle-end.service';
import {
  sendPushNotifications,
  type PushMessageInput,
} from '../domains/notifications/infrastructure/services/expo-push.service';
import type { PushJobData } from '../domains/notifications/domain/services/notification.service';

/**
 * BullMQ workers for TallyUp background processing:
 *
 *  - `cycle-end`        : evaluates a cycle, persists the result, starts the
 *                         next cycle (or archives), dispatches notifications.
 *                         Idempotent (guarded inside processCycleEnd).
 *  - `push-notification`: delivers an Expo push to all of a user's devices
 *                         and prunes tokens Expo reports as unregistered.
 *
 * Workers require a dedicated ioredis connection with
 * `maxRetriesPerRequest: null` (BullMQ requirement for blocking commands).
 */
export default fp(
  async (fastify) => {
    if (fastify.config.NODE_ENV === 'test' || !fastify.redis) {
      fastify.log.info('Skipping BullMQ workers (test environment or no Redis)');
      return;
    }

    // BullMQ requires maxRetriesPerRequest: null for blocking commands.
    // Pass connection options (not an ioredis instance) so BullMQ owns its
    // own dedicated blocking connections.
    const connection = {
      host: fastify.redis.options.host ?? 'localhost',
      port: fastify.redis.options.port ?? 6379,
      maxRetriesPerRequest: null,
    };

    const cycleEndWorker = new Worker(
      'default-jobs',
      async (job) => {
        if (job.name !== 'cycle-end') return;
        const { cycleId } = job.data as { cycleId: string; roomId: string };
        fastify.log.info({ cycleId }, 'Processing cycle-end job');
        const outcome = await processCycleEnd(fastify, cycleId);
        fastify.log.info(
          { cycleId, processed: outcome.processed },
          'cycle-end job finished',
        );
      },
      { connection },
    );

    const pushWorker = new Worker(
      'default-jobs',
      async (job) => {
        if (job.name !== 'push-notification') return;
        const data = job.data as PushJobData;

        const tokens = await fastify.prisma.deviceToken.findMany({
          where: { userId: data.userId },
          select: { token: true },
        });
        if (tokens.length === 0) return;

        const messages: PushMessageInput[] = tokens.map((t) => ({
          token: t.token,
          title: data.title,
          body: data.body,
          data: data.data,
        }));

        const result = await sendPushNotifications(messages, {
          info: (...a) => fastify.log.info(...(a as [object])),
          warn: (...a) => fastify.log.warn(...(a as [object])),
          error: (...a) => fastify.log.error(...(a as [object])),
        });

        if (result.invalidTokens.length > 0) {
          await fastify.prisma.deviceToken.deleteMany({
            where: { token: { in: result.invalidTokens } },
          });
          fastify.log.info(
            { count: result.invalidTokens.length },
            'Pruned unregistered device tokens',
          );
        }
      },
      { connection },
    );

    cycleEndWorker.on('failed', (job, err) => {
      fastify.log.error({ jobId: job?.id, err }, 'cycle-end job failed');
    });
    pushWorker.on('failed', (job, err) => {
      fastify.log.error({ jobId: job?.id, err }, 'push-notification job failed');
    });

    fastify.log.info('BullMQ workers started (cycle-end, push-notification)');

    fastify.addHook('onClose', async () => {
      await cycleEndWorker.close();
      await pushWorker.close();
      fastify.log.info('BullMQ workers closed');
    });
  },
  { name: 'workers-plugin', dependencies: ['redis-plugin', 'bullmq-plugin', 'prisma-plugin'] },
);
