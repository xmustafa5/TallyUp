import type { FastifyInstance } from 'fastify';
import usersRoutes from './presentation/routes/users.routes';

export default async function usersDomain(fastify: FastifyInstance) {
  await fastify.register(usersRoutes, { prefix: '/users' });
}
