import type { FastifyInstance } from 'fastify';
import profileRoutes from './presentation/routes/profile.routes';

export default async function profileDomain(fastify: FastifyInstance) {
  await fastify.register(profileRoutes, { prefix: '/profile' });
}
