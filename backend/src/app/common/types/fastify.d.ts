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
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      publicId?: string;
      email?: string;
      type?: 'access' | 'refresh';
      jti?: string;
    };
    user: {
      id: string;
      publicId?: string;
      email?: string;
      type?: 'access' | 'refresh';
      jti?: string;
    };
  }
}
