import type { FastifyInstance } from 'fastify';
import notificationsRoutes from './presentation/routes/notifications.routes';

export default async function notificationsDomain(fastify: FastifyInstance) {
  await fastify.register(notificationsRoutes);
}
