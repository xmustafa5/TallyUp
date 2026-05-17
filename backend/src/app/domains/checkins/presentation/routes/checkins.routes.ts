import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { requireMembership } from '../../../../common/preHandlers/require-membership';
import {
  resolvePagination,
  paginationMeta,
} from '../../../../common/schemas/shared.schemas';
import {
  MAX_CHECK_INS_PER_DAY,
  startOfRoomDay,
  applyCap,
  isWithinUndoWindow,
} from '../../domain/services/check-in.service';
import {
  createCheckInSchema,
  listCheckInsSchema,
  undoCheckInSchema,
} from '../schemas/checkins.schemas';

function serialize(c: {
  id: string;
  cycleId: string;
  userId: string;
  points: number;
  note: string | null;
  createdAt: Date;
  undoneAt: Date | null;
}) {
  return {
    id: c.id,
    cycleId: c.cycleId,
    userId: c.userId,
    points: c.points,
    note: c.note ?? null,
    createdAt: c.createdAt.toISOString(),
    undoneAt: c.undoneAt ? c.undoneAt.toISOString() : null,
  };
}

export default async function checkinsRoutes(fastify: FastifyInstance) {
  // POST /rooms/:id/check-ins
  fastify.post<{
    Params: { id: string };
    Body: { points: number; note?: string | null; clientId?: string };
  }>(
    '/rooms/:id/check-ins',
    { schema: createCheckInSchema, preHandler: requireMembership },
    async (request, reply) => {
      const room = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
        include: { currentCycle: true },
      });
      if (!room) return reply.notFound('Room not found');
      if (room.status !== 'active' || !room.currentCycle) {
        return reply.badRequest('This room has no active cycle');
      }

      const cycle = room.currentCycle;
      const userId = request.user.id;
      const { clientId } = request.body;

      // Idempotent replay: same (userId, clientId) returns the existing row.
      if (clientId) {
        const dup = await fastify.prisma.checkIn.findUnique({
          where: { userId_clientId: { userId, clientId } },
        });
        if (dup) {
          const sumAgg = await fastify.prisma.checkIn.aggregate({
            where: { cycleId: cycle.id, userId, undoneAt: null },
            _sum: { points: true },
          });
          const myPoints = sumAgg._sum.points ?? 0;
          return reply.code(201).send({
            success: true,
            data: {
              checkIn: serialize(dup),
              myPoints,
              target: request.membership!.target,
              percent:
                request.membership!.target > 0
                  ? Math.min(
                      100,
                      Math.round((myPoints / request.membership!.target) * 100),
                    )
                  : 0,
            },
          });
        }
      }

      // Rate limit: max 50 check-ins per user per room per local day.
      const dayStart = startOfRoomDay(room.timezone);
      const todayCount = await fastify.prisma.checkIn.count({
        where: {
          userId,
          cycle: { roomId: room.id },
          createdAt: { gte: dayStart },
        },
      });
      if (todayCount >= MAX_CHECK_INS_PER_DAY) {
        return reply
          .code(429)
          .send({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Daily check-in limit of ${MAX_CHECK_INS_PER_DAY} reached`,
          });
      }

      // Cap at target if enabled.
      const sumAgg = await fastify.prisma.checkIn.aggregate({
        where: { cycleId: cycle.id, userId, undoneAt: null },
        _sum: { points: true },
      });
      const currentSum = sumAgg._sum.points ?? 0;
      const target = request.membership!.target;
      const pointsToRecord = applyCap(
        request.body.points,
        currentSum,
        target,
        room.capAtTarget,
      );
      if (pointsToRecord <= 0) {
        return reply.badRequest('You have already reached your target');
      }

      const checkIn = await fastify.prisma.checkIn.create({
        data: {
          cycle: { connect: { id: cycle.id } },
          user: { connect: { id: userId } },
          points: pointsToRecord,
          note: request.body.note ?? null,
          clientId: clientId ?? null,
        },
      });

      const myPoints = currentSum + pointsToRecord;
      return reply.code(201).send({
        success: true,
        data: {
          checkIn: serialize(checkIn),
          myPoints,
          target,
          percent:
            target > 0 ? Math.min(100, Math.round((myPoints / target) * 100)) : 0,
        },
      });
    },
  );

  // GET /rooms/:id/check-ins
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: number; pageSize?: number; cycleId?: string; userId?: string };
  }>(
    '/rooms/:id/check-ins',
    { schema: listCheckInsSchema, preHandler: requireMembership },
    async (request, reply) => {
      const { page, pageSize, skip, take } = resolvePagination(request.query);

      let cycleId = request.query.cycleId;
      if (!cycleId) {
        const room = await fastify.prisma.room.findUnique({
          where: { id: request.params.id },
          select: { currentCycleId: true },
        });
        cycleId = room?.currentCycleId ?? undefined;
      }

      const where: Prisma.CheckInWhereInput = {
        cycle: { roomId: request.params.id },
        ...(cycleId ? { cycleId } : {}),
        ...(request.query.userId ? { userId: request.query.userId } : {}),
      };

      const [rows, total] = await Promise.all([
        fastify.prisma.checkIn.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        fastify.prisma.checkIn.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: rows.map(serialize),
        meta: paginationMeta(total, page, pageSize),
      });
    },
  );

  // DELETE /check-ins/:checkInId
  fastify.delete<{ Params: { checkInId: string } }>(
    '/check-ins/:checkInId',
    { schema: undoCheckInSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const checkIn = await fastify.prisma.checkIn.findUnique({
        where: { id: request.params.checkInId },
      });
      if (!checkIn || checkIn.userId !== request.user.id) {
        return reply.notFound('Check-in not found');
      }
      if (checkIn.undoneAt) {
        return reply.send({ success: true, message: 'Already undone' });
      }
      if (!isWithinUndoWindow(checkIn.createdAt)) {
        return reply.conflict('Undo is only allowed within 24 hours');
      }

      await fastify.prisma.checkIn.update({
        where: { id: checkIn.id },
        data: { undoneAt: new Date() },
      });
      return reply.send({ success: true, message: 'Check-in undone' });
    },
  );
}
