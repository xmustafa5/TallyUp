import type { FastifyInstance } from 'fastify';
import gapPeriodRoutes from './presentation/routes/gap-period.routes';

export default async function gapPeriodDomain(fastify: FastifyInstance) {
  await fastify.register(gapPeriodRoutes, { prefix: '/gap-periods' });
}
