import type { FastifyInstance } from 'fastify';
import invitationsRoutes from './presentation/routes/invitations.routes';

export default async function invitationsDomain(fastify: FastifyInstance) {
  await fastify.register(invitationsRoutes);
}
