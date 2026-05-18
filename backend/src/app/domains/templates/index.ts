import type { FastifyInstance } from 'fastify';
import templatesRoutes from './presentation/routes/templates.routes';

export default async function templatesDomain(fastify: FastifyInstance) {
  await fastify.register(templatesRoutes);
}
