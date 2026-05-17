import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import {
  resolvePagination,
  paginationMeta,
} from '../../../../common/schemas/shared.schemas';
import {
  listNotificationsSchema,
  markReadSchema,
  registerDeviceTokenSchema,
  deleteDeviceTokenSchema,
} from '../schemas/notifications.schemas';

interface ListQuery {
  page?: number;
  pageSize?: number;
  unread?: boolean;
}

interface MarkReadBody {
  ids: string[] | 'all';
}

interface RegisterTokenBody {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: ListQuery }>(
    '/notifications',
    { schema: listNotificationsSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const { page, pageSize, skip, take } = resolvePagination(request.query);
      const where: Prisma.NotificationWhereInput = {
        userId: request.user.id,
        ...(request.query.unread ? { readAt: null } : {}),
      };

      const [rows, total] = await Promise.all([
        fastify.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        fastify.prisma.notification.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: rows.map((n) => ({
          id: n.id,
          type: n.type,
          payload: n.payload,
          readAt: n.readAt ? n.readAt.toISOString() : null,
          createdAt: n.createdAt.toISOString(),
        })),
        meta: paginationMeta(total, page, pageSize),
      });
    },
  );

  fastify.post<{ Body: MarkReadBody }>(
    '/notifications/mark-read',
    { schema: markReadSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const now = new Date();
      await fastify.prisma.notification.updateMany({
        where: {
          userId: request.user.id,
          readAt: null,
          ...(request.body.ids === 'all' ? {} : { id: { in: request.body.ids } }),
        },
        data: { readAt: now },
      });
      return reply.send({ success: true, message: 'Notifications marked as read' });
    },
  );

  fastify.post<{ Body: RegisterTokenBody }>(
    '/notifications/device-tokens',
    { schema: registerDeviceTokenSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const { token, platform } = request.body;
      const row = await fastify.prisma.deviceToken.upsert({
        where: { token },
        create: {
          token,
          platform,
          user: { connect: { id: request.user.id } },
        },
        update: {
          platform,
          lastSeenAt: new Date(),
          user: { connect: { id: request.user.id } },
        },
      });
      return reply.send({
        success: true,
        data: { id: row.id, platform: row.platform },
      });
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/notifications/device-tokens/:id',
    { schema: deleteDeviceTokenSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const { count } = await fastify.prisma.deviceToken.deleteMany({
        where: { id: request.params.id, userId: request.user.id },
      });
      if (count === 0) return reply.notFound('Device token not found');
      return reply.send({ success: true, message: 'Device token removed' });
    },
  );
}
