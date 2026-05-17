import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';

export default fp(
  async (fastify) => {
    await fastify.register(fastifyJwt, {
      secret: fastify.config.JWT_SECRET,
      sign: {
        // Access-token lifetime. Refresh tokens override this per-call
        // via reply.jwtSign(payload, { sign: { expiresIn } }).
        expiresIn: fastify.config.JWT_EXPIRES_IN,
      },
    });

    // Guard for protected routes. Only access tokens may authorize API
    // calls; refresh tokens are confined to POST /auth/refresh.
    fastify.decorate(
      'authenticate',
      async function (request: FastifyRequest, reply: FastifyReply) {
        try {
          await request.jwtVerify();
        } catch {
          return reply.unauthorized('Invalid or expired token');
        }

        if (request.user.type === 'refresh') {
          return reply.unauthorized('Refresh token cannot be used to access resources');
        }
      },
    );
  },
  { name: 'auth-plugin' },
);
