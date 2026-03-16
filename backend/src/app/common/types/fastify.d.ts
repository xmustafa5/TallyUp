import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis?: Redis;
    queues?: {
      default: Queue;
    };
  }
}
