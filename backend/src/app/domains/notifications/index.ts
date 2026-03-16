import type { FastifyInstance } from 'fastify';
import notificationRoutes from './presentation/routes/notification.routes';
import { setupReminderJobs } from './infrastructure/jobs/reminder.job';

export default async function notificationsDomain(fastify: FastifyInstance) {
  await fastify.register(notificationRoutes, { prefix: '/notifications' });

  // Set up the BullMQ reminder jobs (skipped in test mode)
  if (fastify.config.NODE_ENV !== 'test') {
    await setupReminderJobs(fastify);
  }
}
