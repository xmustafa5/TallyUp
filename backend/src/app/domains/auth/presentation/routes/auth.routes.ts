import type { FastifyInstance } from 'fastify';
import { registerUser, loginUser } from '../../domain/services/auth.service';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { registerSchema, loginSchema, refreshSchema, meSchema } from '../schemas/auth.schemas';

export default async function authRoutes(fastify: FastifyInstance) {
  const userRepository = new PrismaUserRepository(fastify.prisma);

  // POST /auth/register
  fastify.post('/register', { schema: registerSchema }, async (request, reply) => {
    const { email, name, password } = request.body as {
      email: string;
      name: string;
      password: string;
    };

    try {
      const { user } = await registerUser({ email, name, password }, userRepository);

      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: fastify.config.JWT_EXPIRES_IN },
      );
      const refreshToken = fastify.jwt.sign(
        { id: user.id, type: 'refresh' },
        { expiresIn: fastify.config.JWT_REFRESH_EXPIRES_IN },
      );

      if (fastify.redis) {
        await fastify.redis.set(
          `refresh:${user.id}:${refreshToken}`,
          '1',
          'EX',
          30 * 24 * 60 * 60,
        );
      }

      return reply.code(201).send({
        success: true,
        data: {
          user: user.toResponse(),
          tokens: { accessToken, refreshToken },
        },
      });
    } catch (err: any) {
      if (err.message === 'Email already registered') {
        return reply.conflict(err.message);
      }
      return reply.badRequest(err.message);
    }
  });

  // POST /auth/login
  fastify.post('/login', { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    try {
      const { user } = await loginUser({ email, password }, userRepository);

      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: fastify.config.JWT_EXPIRES_IN },
      );
      const refreshToken = fastify.jwt.sign(
        { id: user.id, type: 'refresh' },
        { expiresIn: fastify.config.JWT_REFRESH_EXPIRES_IN },
      );

      if (fastify.redis) {
        await fastify.redis.set(
          `refresh:${user.id}:${refreshToken}`,
          '1',
          'EX',
          30 * 24 * 60 * 60,
        );
      }

      return reply.send({
        success: true,
        data: {
          user: user.toResponse(),
          tokens: { accessToken, refreshToken },
        },
      });
    } catch (err: any) {
      return reply.unauthorized(err.message);
    }
  });

  // POST /auth/refresh
  fastify.post('/refresh', { schema: refreshSchema }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const decoded = fastify.jwt.verify<{ id: string; type: string }>(refreshToken);

      if (decoded.type !== 'refresh') {
        return reply.unauthorized('Invalid token type');
      }

      if (fastify.redis) {
        const stored = await fastify.redis.get(`refresh:${decoded.id}:${refreshToken}`);
        if (!stored) {
          return reply.unauthorized('Token has been revoked');
        }
        await fastify.redis.del(`refresh:${decoded.id}:${refreshToken}`);
      }

      const user = await userRepository.findById(decoded.id);
      if (!user || !user.isActive) {
        return reply.unauthorized('User not found or deactivated');
      }

      const newAccessToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: fastify.config.JWT_EXPIRES_IN },
      );
      const newRefreshToken = fastify.jwt.sign(
        { id: user.id, type: 'refresh' },
        { expiresIn: fastify.config.JWT_REFRESH_EXPIRES_IN },
      );

      if (fastify.redis) {
        await fastify.redis.set(
          `refresh:${user.id}:${newRefreshToken}`,
          '1',
          'EX',
          30 * 24 * 60 * 60,
        );
      }

      return reply.send({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
    } catch {
      return reply.unauthorized('Invalid or expired refresh token');
    }
  });

  // GET /auth/me
  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate], schema: meSchema },
    async (request, reply) => {
      const { id } = request.user as { id: string };
      const user = await userRepository.findById(id);

      if (!user) {
        return reply.notFound('User not found');
      }

      return reply.send({
        success: true,
        data: user.toResponse(),
      });
    },
  );
}
