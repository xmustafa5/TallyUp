import type { FastifyInstance } from 'fastify';
import {
  getMeSchema,
  updateMeSchema,
  lookupByPublicIdSchema,
  deleteMeSchema,
} from '../schemas/users.schemas';

interface UpdateMeBody {
  displayName?: string;
  avatarUrl?: string | null;
  timezone?: string;
  locale?: string;
  notifyHalfwayBehind?: boolean;
  notifyDeadline?: boolean;
  notifyResults?: boolean;
}

function toFullProfile(user: {
  id: string;
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  timezone: string;
  locale: string;
  notifyHalfwayBehind: boolean;
  notifyDeadline: boolean;
  notifyResults: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    publicId: user.publicId,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    email: user.email,
    timezone: user.timezone,
    locale: user.locale,
    notifyHalfwayBehind: user.notifyHalfwayBehind,
    notifyDeadline: user.notifyDeadline,
    notifyResults: user.notifyResults,
    createdAt: user.createdAt.toISOString(),
  };
}

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/me',
    { schema: getMeSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
      });
      if (!user) return reply.unauthorized('Account no longer exists');
      return reply.send({ success: true, data: toFullProfile(user) });
    },
  );

  fastify.patch<{ Body: UpdateMeBody }>(
    '/me',
    { schema: updateMeSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const b = request.body;
      const user = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: {
          ...(b.displayName !== undefined && { displayName: b.displayName.trim() }),
          ...(b.avatarUrl !== undefined && { avatarUrl: b.avatarUrl }),
          ...(b.timezone !== undefined && { timezone: b.timezone }),
          ...(b.locale !== undefined && { locale: b.locale }),
          ...(b.notifyHalfwayBehind !== undefined && {
            notifyHalfwayBehind: b.notifyHalfwayBehind,
          }),
          ...(b.notifyDeadline !== undefined && { notifyDeadline: b.notifyDeadline }),
          ...(b.notifyResults !== undefined && { notifyResults: b.notifyResults }),
        },
      });
      return reply.send({ success: true, data: toFullProfile(user) });
    },
  );

  fastify.get<{ Params: { publicId: string } }>(
    '/by-public-id/:publicId',
    { schema: lookupByPublicIdSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { publicId: request.params.publicId },
        select: { id: true, publicId: true, displayName: true, avatarUrl: true },
      });
      if (!user) return reply.notFound('No user with that User ID');
      return reply.send({
        success: true,
        data: { ...user, avatarUrl: user.avatarUrl ?? null },
      });
    },
  );

  fastify.delete(
    '/me',
    { schema: deleteMeSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      await fastify.prisma.user.delete({ where: { id: request.user.id } });
      return reply.send({ success: true, message: 'Account deleted' });
    },
  );
}
