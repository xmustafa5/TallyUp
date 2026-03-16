import fp from 'fastify-plugin';
import { Queue } from 'bullmq';

export default fp(
  async (fastify) => {
    if (fastify.config.NODE_ENV === 'test' || !fastify.redis) {
      fastify.log.info('Skipping BullMQ setup (test environment or no Redis)');
      return;
    }

    const defaultQueue = new Queue('default-jobs', {
      connection: {
        host: fastify.redis.options.host ?? 'localhost',
        port: fastify.redis.options.port ?? 6379,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });

    fastify.decorate('queues', { default: defaultQueue });
    fastify.log.info('BullMQ queues initialized');

    fastify.addHook('onClose', async () => {
      await defaultQueue.close();
      fastify.log.info('BullMQ queues closed');
    });
  },
  {
    name: 'bullmq-plugin',
    dependencies: ['redis-plugin'],
  },
);
