import type { FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword } from '../../domain/services/password.service';
import { issueTokenPair, rotateRefreshToken } from '../../domain/services/token.service';
import { generatePublicId } from '../../../users/domain/services/public-id.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from '../schemas/auth.schemas';

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
  locale?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

function toAuthUser(user: {
  id: string;
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  timezone: string;
  locale: string;
}) {
  return {
    id: user.id,
    publicId: user.publicId,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    email: user.email,
    timezone: user.timezone,
    locale: user.locale,
  };
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    { schema: registerSchema },
    async (request, reply) => {
      const { email, password, displayName } = request.body;
      const timezone = request.body.timezone ?? 'UTC';
      const locale = request.body.locale ?? 'en';

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existing) {
        return reply.conflict('An account with this email already exists');
      }

      const passwordHash = await hashPassword(password);
      const publicId = await generatePublicId(fastify.prisma, displayName);

      const user = await fastify.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          displayName: displayName.trim(),
          publicId,
          timezone,
          locale,
        },
      });

      const tokens = await issueTokenPair(fastify, user);

      return reply.code(201).send({
        success: true,
        data: { ...tokens, user: toAuthUser(user) },
      });
    },
  );

  fastify.post<{ Body: LoginBody }>(
    '/login',
    { schema: loginSchema },
    async (request, reply) => {
      const normalizedEmail = request.body.email.trim().toLowerCase();

      const user = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user || !(await verifyPassword(request.body.password, user.passwordHash))) {
        return reply.unauthorized('Invalid email or password');
      }

      const tokens = await issueTokenPair(fastify, user);

      return reply.send({
        success: true,
        data: { ...tokens, user: toAuthUser(user) },
      });
    },
  );

  fastify.post<{ Body: RefreshBody }>(
    '/refresh',
    { schema: refreshSchema },
    async (request, reply) => {
      let payload: { id: string; jti?: string; type?: string };
      try {
        payload = fastify.jwt.verify(request.body.refreshToken);
      } catch {
        return reply.unauthorized('Invalid or expired refresh token');
      }

      const tokens = await rotateRefreshToken(fastify, payload);
      if (!tokens) {
        return reply.unauthorized('Invalid or expired refresh token');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (!user) {
        return reply.unauthorized('Invalid or expired refresh token');
      }

      return reply.send({
        success: true,
        data: { ...tokens, user: toAuthUser(user) },
      });
    },
  );

  fastify.post(
    '/logout',
    { schema: logoutSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      // Revoke all active refresh tokens for this account. Simple and
      // correct for "log out"; per-device logout arrives in Phase 2.
      await fastify.prisma.refreshToken.updateMany({
        where: { userId: request.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return reply.send({ success: true, message: 'Logged out' });
    },
  );
}
