import type { FastifyInstance } from 'fastify';
import healthRoutes from './presentation/routes/health.routes';

export default async function healthDomain(fastify: FastifyInstance) {
  await fastify.register(healthRoutes, { prefix: '/health' });
}
