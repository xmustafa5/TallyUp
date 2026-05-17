import type { FastifyInstance } from 'fastify';
import {
  requireMembership,
  requireAdmin,
} from '../../../../common/preHandlers/require-membership';
import {
  resolvePagination,
  paginationMeta,
} from '../../../../common/schemas/shared.schemas';
import { buildLeaderboard } from '../../domain/services/leaderboard.service';
import { processCycleEnd } from '../../domain/services/cycle-end.service';
import {
  listCyclesSchema,
  getCurrentCycleSchema,
  getCycleSchema,
  advanceCycleSchema,
} from '../schemas/cycles.schemas';

export default async function cyclesRoutes(fastify: FastifyInstance) {
  // GET /rooms/:id/cycles  -- history
  fastify.get<{ Params: { id: string }; Querystring: { page?: number; pageSize?: number } }>(
    '/rooms/:id/cycles',
    { schema: listCyclesSchema, preHandler: requireMembership },
    async (request, reply) => {
      const { page, pageSize, skip, take } = resolvePagination(request.query);
      const where = { roomId: request.params.id };

      const [rows, total] = await Promise.all([
        fastify.prisma.cycle.findMany({
          where,
          orderBy: { cycleNumber: 'desc' },
          skip,
          take,
        }),
        fastify.prisma.cycle.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: rows.map((c) => ({
          id: c.id,
          roomId: c.roomId,
          cycleNumber: c.cycleNumber,
          startsAt: c.startsAt.toISOString(),
          endsAt: c.endsAt.toISOString(),
          status: c.status,
          resultJson: (c.resultJson as Record<string, unknown> | null) ?? null,
        })),
        meta: paginationMeta(total, page, pageSize),
      });
    },
  );

  // GET /rooms/:id/cycles/current
  fastify.get<{ Params: { id: string } }>(
    '/rooms/:id/cycles/current',
    { schema: getCurrentCycleSchema, preHandler: requireMembership },
    async (request, reply) => {
      const room = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
        include: { currentCycle: true },
      });
      if (!room || !room.currentCycle) {
        return reply.notFound('No active cycle for this room');
      }
      const c = room.currentCycle;
      const leaderboard = await buildLeaderboard(
        fastify.prisma,
        c.id,
        room.id,
        c.startsAt,
      );

      return reply.send({
        success: true,
        data: {
          id: c.id,
          roomId: c.roomId,
          cycleNumber: c.cycleNumber,
          startsAt: c.startsAt.toISOString(),
          endsAt: c.endsAt.toISOString(),
          status: c.status,
          leaderboard,
          resultJson: (c.resultJson as Record<string, unknown> | null) ?? null,
        },
      });
    },
  );

  // GET /cycles/:cycleId
  fastify.get<{ Params: { cycleId: string } }>(
    '/cycles/:cycleId',
    { schema: getCycleSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const cycle = await fastify.prisma.cycle.findUnique({
        where: { id: request.params.cycleId },
      });
      if (!cycle) return reply.notFound('Cycle not found');

      // Membership check: caller must belong to the cycle's room.
      const membership = await fastify.prisma.membership.findUnique({
        where: { roomId_userId: { roomId: cycle.roomId, userId: request.user.id } },
      });
      if (!membership) return reply.forbidden('You are not a member of this room');

      const leaderboard = await buildLeaderboard(
        fastify.prisma,
        cycle.id,
        cycle.roomId,
        cycle.startsAt,
      );

      return reply.send({
        success: true,
        data: {
          id: cycle.id,
          roomId: cycle.roomId,
          cycleNumber: cycle.cycleNumber,
          startsAt: cycle.startsAt.toISOString(),
          endsAt: cycle.endsAt.toISOString(),
          status: cycle.status,
          leaderboard,
          resultJson: (cycle.resultJson as Record<string, unknown> | null) ?? null,
        },
      });
    },
  );

  // POST /test/cycles/:cycleId/advance  -- TEST ONLY
  fastify.post<{ Params: { cycleId: string } }>(
    '/test/cycles/:cycleId/advance',
    {
      schema: advanceCycleSchema,
      preHandler: async (request, reply) => {
        if (fastify.config.NODE_ENV === 'production') {
          return reply.notFound('Not found');
        }
        // Resolve the cycle's room so requireAdmin can check the role.
        const cycle = await fastify.prisma.cycle.findUnique({
          where: { id: request.params.cycleId },
          select: { roomId: true },
        });
        if (!cycle) return reply.notFound('Cycle not found');
        (request.params as Record<string, string>).id = cycle.roomId;
        await requireAdmin(request, reply);
      },
    },
    async (request, reply) => {
      const outcome = await processCycleEnd(fastify, request.params.cycleId);
      return reply.send({
        success: true,
        data: {
          processed: outcome.processed,
          result: (outcome.result as unknown as Record<string, unknown>) ?? null,
        },
      });
    },
  );
}
