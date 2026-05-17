import type { FastifyInstance } from 'fastify';
import roomsRoutes from './presentation/routes/rooms.routes';

export default async function roomsDomain(fastify: FastifyInstance) {
  await fastify.register(roomsRoutes);
}
