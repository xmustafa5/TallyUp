import type { FastifyInstance } from 'fastify';
import checkinsRoutes from './presentation/routes/checkins.routes';

export default async function checkinsDomain(fastify: FastifyInstance) {
  await fastify.register(checkinsRoutes);
}
