import type { FastifyInstance } from 'fastify';
import { getLivenessStatus, getReadinessStatus } from '../../domain/services/health-check.service';
import { healthLivenessSchema, healthReadinessSchema } from '../schemas/health.schemas';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', { schema: healthLivenessSchema }, async (_request, reply) => {
    const status = getLivenessStatus();
    return reply.send({ success: true, data: status });
  });

  fastify.get('/ready', { schema: healthReadinessSchema }, async (_request, reply) => {
    const status = await getReadinessStatus({
      checkDatabase: async () => {
        await fastify.prisma.$queryRaw`SELECT 1`;
        return true;
      },
      checkRedis: async () => {
        if (!fastify.redis) return false;
        const pong = await fastify.redis.ping();
        return pong === 'PONG';
      },
    });

    if (status.status !== 'ok') {
      return reply.code(503).send({ success: false, data: status });
    }
    return reply.send({ success: true, data: status });
  });
}
