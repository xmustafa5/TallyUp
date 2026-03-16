import type { FastifyInstance } from 'fastify';
import authRoutes from './presentation/routes/auth.routes';

export default async function authDomain(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: '/auth' });
}
