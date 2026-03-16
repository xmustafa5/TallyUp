import type { FastifyInstance } from 'fastify';
import scheduleRoutes from './presentation/routes/schedule.routes';

export default async function scheduleDomain(fastify: FastifyInstance) {
  await fastify.register(scheduleRoutes, { prefix: '/schedule' });
}
