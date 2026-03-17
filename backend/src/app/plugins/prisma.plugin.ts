import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export default fp(
  async (fastify) => {
    const adapter = new PrismaPg({
      connectionString: fastify.config.DATABASE_URL,
    });

    const prisma = new PrismaClient({
      adapter,
      log:
        fastify.config.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });

    await prisma.$connect();
    fastify.log.info('Prisma client connected to database');

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
      await prisma.$disconnect();
      fastify.log.info('Prisma client disconnected');
    });
  },
  { name: 'prisma-plugin' },
);
