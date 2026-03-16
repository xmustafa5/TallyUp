import type { FastifyInstance } from 'fastify';
import { Worker } from 'bullmq';
import { PrismaDailyTrackerRepository } from '../repositories/prisma-daily-tracker.repository';
import { finalizeTracker } from '../../domain/services/finalization.service';
import { getTodayUTC } from '../../domain/services/daily-tracker.service';

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

      const repository = new PrismaDailyTrackerRepository(fastify.prisma);
      const today = getTodayUTC();

      const unfinalizedTrackers = await repository.findUnfinalizedBefore(today);

      if (unfinalizedTrackers.length === 0) {
        fastify.log.info('No unfinalized trackers to process');
        return;
      }

      let finalized = 0;
      for (const tracker of unfinalizedTrackers) {
        try {
          await finalizeTracker(fastify.prisma, tracker);
          finalized++;
        } catch (error) {
          fastify.log.error(
            { trackerId: tracker.id, error },
            'Failed to finalize tracker',
          );
        }
      }

      fastify.log.info(
        { finalized, total: unfinalizedTrackers.length },
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
