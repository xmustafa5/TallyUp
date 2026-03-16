import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(
  async (fastify) => {
    await fastify.register(fastifyJwt, {
      secret: fastify.config.JWT_SECRET,
    });

    fastify.decorate('authenticate', async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.unauthorized('Invalid or expired token');
      }
    });
  },
  { name: 'auth-plugin' },
);
