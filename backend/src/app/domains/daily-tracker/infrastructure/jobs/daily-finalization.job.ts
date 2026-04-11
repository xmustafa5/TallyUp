import type { FastifyInstance } from 'fastify';
import { Worker } from 'bullmq';
import { catchUpUserFinalization } from '../../domain/services/catch-up.service';

/**
 * Sets up the daily finalization BullMQ job.
 * Adds a repeatable job that runs at midnight UTC and finalizes all
 * unfinalized trackers from previous days.
 */
export async function setupFinalizationJob(fastify: FastifyInstance): Promise<void> {
  if (!fastify.queues?.default) {
    fastify.log.warn('BullMQ queue not available, skipping finalization job setup');
    return;
  }

  const queue = fastify.queues.default;

  // Add a repeatable job that runs at midnight UTC
  await queue.add(
    'finalize-daily-trackers',
    {},
    {
      repeat: {
        pattern: '0 0 * * *',
      },
    },
  );

  fastify.log.info('Daily finalization repeatable job registered (midnight UTC)');

  // Create a worker to process the finalization job
  const connection = {
    host: fastify.redis?.options.host ?? 'localhost',
    port: fastify.redis?.options.port ?? 6379,
  };

  const worker = new Worker(
    'default-jobs',
    async (job) => {
      if (job.name !== 'finalize-daily-trackers') {
        return;
      }

      fastify.log.info('Starting daily finalization job');

      // Iterate every active user and catch up their finalization. The
      // catch-up service handles both cases: existing unfinalized rows
      // AND missing rows for days the user never opened the app.
      const users = await fastify.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      let totalBackfilled = 0;
      let totalFinalized = 0;
      for (const user of users) {
        try {
          const result = await catchUpUserFinalization(
            fastify.prisma,
            user.id,
          );
          totalBackfilled += result.backfilled;
          totalFinalized += result.finalized;
        } catch (error) {
          fastify.log.error(
            { userId: user.id, error },
            'Failed to catch up user finalization',
          );
        }
      }

      fastify.log.info(
        {
          users: users.length,
          backfilled: totalBackfilled,
          finalized: totalFinalized,
        },
        'Daily finalization job completed',
      );
    },
    { connection },
  );

  fastify.addHook('onClose', async () => {
    await worker.close();
    fastify.log.info('Daily finalization worker closed');
  });
}
