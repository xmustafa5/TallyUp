import fp from 'fastify-plugin';
import Redis from 'ioredis';

export default fp(
  async (fastify) => {
    if (fastify.config.NODE_ENV === 'test') {
      fastify.log.info('Skipping Redis connection in test environment');
      return;
    }

    const redis = new Redis(fastify.config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        fastify.log.warn({ attempt: times, delay }, 'Redis reconnecting...');
        return delay;
      },
    });

    redis.on('connect', () => {
      fastify.log.info('Redis client connected');
    });

    redis.on('error', (err) => {
      fastify.log.error({ err }, 'Redis client error');
    });

    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
      await redis.quit();
      fastify.log.info('Redis client disconnected');
    });
  },
  { name: 'redis-plugin' },
);
