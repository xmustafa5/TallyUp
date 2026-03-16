import type { FastifyInstance } from 'fastify';
import makeupRoutes from './presentation/routes/makeup.routes';

export default async function makeupDomain(fastify: FastifyInstance) {
  await fastify.register(makeupRoutes, { prefix: '/makeup' });
}
