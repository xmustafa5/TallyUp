import type { FastifyInstance } from 'fastify';
import progressRoutes from './presentation/routes/progress.routes';

export default async function progressDomain(fastify: FastifyInstance) {
  await fastify.register(progressRoutes, { prefix: '/progress' });
}
