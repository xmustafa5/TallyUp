import type { FastifyInstance } from 'fastify';
import dailyTrackerRoutes from './presentation/routes/daily-tracker.routes';
import { setupFinalizationJob } from './infrastructure/jobs/daily-finalization.job';

export default async function dailyTrackerDomain(fastify: FastifyInstance) {
  await fastify.register(dailyTrackerRoutes, { prefix: '/daily-tracker' });

  // Set up the BullMQ finalization job (skipped in test mode)
  if (fastify.config.NODE_ENV !== 'test') {
    await setupFinalizationJob(fastify);
  }
}
