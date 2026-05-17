import type { FastifyInstance } from 'fastify';
import cyclesRoutes from './presentation/routes/cycles.routes';

export default async function cyclesDomain(fastify: FastifyInstance) {
  await fastify.register(cyclesRoutes);
}
