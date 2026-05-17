import type { FastifyInstance } from 'fastify';
import {
  requireMembership,
  requireAdmin,
} from '../../../../common/preHandlers/require-membership';
import {
  validateRoomConfig,
  validateRuleAgainstMemberCount,
  type RoomConfig,
} from '../../domain/services/room-policy.service';
import { startFirstCycle } from '../../../cycles/domain/services/cycle-lifecycle.service';
import {
  scheduleCycleEnd,
} from '../../../cycles/domain/services/cycle-lifecycle.service';
import {
  serializeRoomCore,
  serializeRoomDetail,
  serializeMember,
  serializeCycleSummary,
} from '../../domain/services/room-serializer';
import {
  createRoomSchema,
  listRoomsSchema,
  getRoomSchema,
  patchRoomSchema,
  startRoomSchema,
  roomActionSchema,
  transferAdminSchema,
  listMembersSchema,
  patchMemberSchema,
  removeMemberSchema,
  leaveRoomSchema,
} from '../schemas/rooms.schemas';

const memberInclude = {
  memberships: { include: { user: true } },
  currentCycle: true,
} as const;

async function loadRoomDetail(fastify: FastifyInstance, roomId: string, userId: string) {
  const room = await fastify.prisma.room.findUnique({
    where: { id: roomId },
    include: memberInclude,
  });
  if (!room) return null;
  const mine = room.memberships.find((m) => m.userId === userId);
  return { room, myRole: (mine?.role ?? 'member') as 'admin' | 'member' };
}

export default async function roomsRoutes(fastify: FastifyInstance) {
  // POST /rooms
  fastify.post(
    '/rooms',
    { schema: createRoomSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      const config: RoomConfig = {
        periodType: b.periodType as RoomConfig['periodType'],
        customDays: (b.customDays as number | null) ?? null,
        startDayOfWeek: (b.startDayOfWeek as number | null) ?? null,
        startDayOfMonth: (b.startDayOfMonth as number | null) ?? null,
        winnerRule: (b.winnerRule as RoomConfig['winnerRule']) ?? 'none',
        winnerN: (b.winnerN as number | null) ?? null,
        loserRule: (b.loserRule as RoomConfig['loserRule']) ?? 'none',
        loserN: (b.loserN as number | null) ?? null,
      };
      const errors = validateRoomConfig(config);
      if (errors.length > 0) {
        return reply.badRequest(errors.map((e) => `${e.field}: ${e.message}`).join('; '));
      }

      const creator = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: { timezone: true },
      });

      const room = await fastify.prisma.room.create({
        data: {
          name: (b.name as string).trim(),
          icon: (b.icon as string | null) ?? null,
          description: (b.description as string | null) ?? null,
          timezone: (b.timezone as string) || creator?.timezone || 'UTC',
          periodType: config.periodType,
          customDays: config.customDays,
          startDayOfWeek: config.startDayOfWeek,
          startDayOfMonth: config.startDayOfMonth,
          winnerRule: config.winnerRule,
          winnerN: config.winnerN,
          loserRule: config.loserRule,
          loserN: config.loserN,
          capAtTarget: (b.capAtTarget as boolean | undefined) ?? true,
          stake: (b.stake as string | null) ?? null,
          admin: { connect: { id: request.user.id } },
          memberships: {
            create: { userId: request.user.id, role: 'admin', target: 1 },
          },
        },
        include: memberInclude,
      });

      return reply
        .code(201)
        .send({ success: true, data: serializeRoomDetail(room, 'admin') });
    },
  );

  // GET /rooms
  fastify.get(
    '/rooms',
    { schema: listRoomsSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const memberships = await fastify.prisma.membership.findMany({
        where: { userId: request.user.id, leftAt: null },
        include: {
          room: {
            include: {
              currentCycle: true,
              _count: { select: { memberships: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      const data = memberships.map((m) => ({
        ...serializeRoomCore(m.room),
        myRole: m.role,
        memberCount: m.room._count.memberships,
        currentCycle: serializeCycleSummary(m.room.currentCycle),
      }));

      return reply.send({ success: true, data });
    },
  );

  // GET /rooms/:id
  fastify.get<{ Params: { id: string } }>(
    '/rooms/:id',
    { schema: getRoomSchema, preHandler: requireMembership },
    async (request, reply) => {
      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      if (!loaded) return reply.notFound('Room not found');
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded.room, loaded.myRole),
      });
    },
  );

  // PATCH /rooms/:id
  fastify.patch<{ Params: { id: string } }>(
    '/rooms/:id',
    { schema: patchRoomSchema, preHandler: requireAdmin },
    async (request, reply) => {
      const b = request.body as Record<string, unknown>;
      const current = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
      });
      if (!current) return reply.notFound('Room not found');

      const merged: RoomConfig = {
        periodType: (b.periodType as RoomConfig['periodType']) ?? current.periodType,
        customDays:
          b.customDays !== undefined ? (b.customDays as number | null) : current.customDays,
        startDayOfWeek:
          b.startDayOfWeek !== undefined
            ? (b.startDayOfWeek as number | null)
            : current.startDayOfWeek,
        startDayOfMonth:
          b.startDayOfMonth !== undefined
            ? (b.startDayOfMonth as number | null)
            : current.startDayOfMonth,
        winnerRule: (b.winnerRule as RoomConfig['winnerRule']) ?? current.winnerRule,
        winnerN: b.winnerN !== undefined ? (b.winnerN as number | null) : current.winnerN,
        loserRule: (b.loserRule as RoomConfig['loserRule']) ?? current.loserRule,
        loserN: b.loserN !== undefined ? (b.loserN as number | null) : current.loserN,
      };
      const errors = validateRoomConfig(merged);
      if (errors.length > 0) {
        return reply.badRequest(errors.map((e) => `${e.field}: ${e.message}`).join('; '));
      }

      await fastify.prisma.room.update({
        where: { id: request.params.id },
        data: {
          ...(b.name !== undefined && { name: (b.name as string).trim() }),
          ...(b.icon !== undefined && { icon: b.icon as string | null }),
          ...(b.description !== undefined && {
            description: b.description as string | null,
          }),
          ...(b.stake !== undefined && { stake: b.stake as string | null }),
          ...(b.timezone !== undefined && { timezone: b.timezone as string }),
          ...(b.periodType !== undefined && { periodType: merged.periodType }),
          ...(b.customDays !== undefined && { customDays: merged.customDays }),
          ...(b.startDayOfWeek !== undefined && {
            startDayOfWeek: merged.startDayOfWeek,
          }),
          ...(b.startDayOfMonth !== undefined && {
            startDayOfMonth: merged.startDayOfMonth,
          }),
          ...(b.winnerRule !== undefined && { winnerRule: merged.winnerRule }),
          ...(b.winnerN !== undefined && { winnerN: merged.winnerN }),
          ...(b.loserRule !== undefined && { loserRule: merged.loserRule }),
          ...(b.loserN !== undefined && { loserN: merged.loserN }),
          ...(b.capAtTarget !== undefined && {
            capAtTarget: b.capAtTarget as boolean,
          }),
        },
      });

      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded!.room, loaded!.myRole),
      });
    },
  );

  // POST /rooms/:id/start
  fastify.post<{ Params: { id: string }; Body: { startAtNextBoundary?: boolean } }>(
    '/rooms/:id/start',
    { schema: startRoomSchema, preHandler: requireAdmin },
    async (request, reply) => {
      const room = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
        include: { _count: { select: { memberships: true } } },
      });
      if (!room) return reply.notFound('Room not found');
      if (room.status !== 'draft') {
        return reply.badRequest('Only a draft room can be started');
      }

      const ruleErrors = validateRuleAgainstMemberCount(
        {
          winnerRule: room.winnerRule,
          winnerN: room.winnerN,
          loserRule: room.loserRule,
          loserN: room.loserN,
        },
        room._count.memberships,
      );
      if (ruleErrors.length > 0) {
        return reply.badRequest(
          ruleErrors.map((e) => `${e.field}: ${e.message}`).join('; '),
        );
      }

      await startFirstCycle(
        fastify,
        room,
        request.body?.startAtNextBoundary ?? false,
      );

      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded!.room, loaded!.myRole),
      });
    },
  );

  // POST /rooms/:id/pause
  fastify.post<{ Params: { id: string } }>(
    '/rooms/:id/pause',
    {
      schema: roomActionSchema(
        'Pause the room',
        'Pause an active room: cancels the scheduled cycle-end job and blocks check-ins. The period clock stops.',
      ),
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const room = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
        include: { currentCycle: true },
      });
      if (!room) return reply.notFound('Room not found');
      if (room.status !== 'active') {
        return reply.badRequest('Only an active room can be paused');
      }

      const queue = fastify.queues?.default;
      if (queue && room.currentCycle?.endJobId) {
        const job = await queue.getJob(room.currentCycle.endJobId);
        if (job) await job.remove();
      }

      await fastify.prisma.room.update({
        where: { id: room.id },
        data: { status: 'paused', pausedAt: new Date() },
      });

      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded!.room, loaded!.myRole),
      });
    },
  );

  // POST /rooms/:id/resume
  fastify.post<{ Params: { id: string } }>(
    '/rooms/:id/resume',
    {
      schema: roomActionSchema(
        'Resume the room',
        'Resume a paused room: re-schedules the cycle-end with the remaining duration carried over from when it was paused.',
      ),
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const room = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
        include: { currentCycle: true },
      });
      if (!room) return reply.notFound('Room not found');
      if (room.status !== 'paused' || !room.currentCycle) {
        return reply.badRequest('Only a paused room can be resumed');
      }

      // Carry over remaining time: newEndsAt = now + (endsAt - pausedAt).
      const pausedAt = room.pausedAt ?? new Date();
      const remainingMs = Math.max(
        0,
        room.currentCycle.endsAt.getTime() - pausedAt.getTime(),
      );
      const newEndsAt = new Date(Date.now() + remainingMs);

      const endJobId = await scheduleCycleEnd(
        fastify,
        room.currentCycle.id,
        room.id,
        newEndsAt,
      );

      await fastify.prisma.cycle.update({
        where: { id: room.currentCycle.id },
        data: { endsAt: newEndsAt, endJobId },
      });
      await fastify.prisma.room.update({
        where: { id: room.id },
        data: { status: 'active', pausedAt: null },
      });

      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded!.room, loaded!.myRole),
      });
    },
  );

  // POST /rooms/:id/archive
  fastify.post<{ Params: { id: string } }>(
    '/rooms/:id/archive',
    {
      schema: roomActionSchema(
        'Archive the room',
        'Archive a room permanently. It becomes read-only; only history remains visible.',
      ),
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const room = await fastify.prisma.room.findUnique({
        where: { id: request.params.id },
        include: { currentCycle: true },
      });
      if (!room) return reply.notFound('Room not found');

      const queue = fastify.queues?.default;
      if (queue && room.currentCycle?.endJobId) {
        const job = await queue.getJob(room.currentCycle.endJobId);
        if (job) await job.remove();
      }

      await fastify.prisma.room.update({
        where: { id: room.id },
        data: { status: 'archived' },
      });

      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded!.room, loaded!.myRole),
      });
    },
  );

  // POST /rooms/:id/transfer-admin
  fastify.post<{ Params: { id: string }; Body: { toUserId: string } }>(
    '/rooms/:id/transfer-admin',
    { schema: transferAdminSchema, preHandler: requireAdmin },
    async (request, reply) => {
      const { toUserId } = request.body;
      if (toUserId === request.user.id) {
        return reply.badRequest('You are already the admin');
      }
      const target = await fastify.prisma.membership.findUnique({
        where: { roomId_userId: { roomId: request.params.id, userId: toUserId } },
      });
      if (!target || target.leftAt) {
        return reply.notFound('Target user is not an active member');
      }

      await fastify.prisma.$transaction([
        fastify.prisma.membership.update({
          where: { roomId_userId: { roomId: request.params.id, userId: request.user.id } },
          data: { role: 'member' },
        }),
        fastify.prisma.membership.update({
          where: { roomId_userId: { roomId: request.params.id, userId: toUserId } },
          data: { role: 'admin' },
        }),
        fastify.prisma.room.update({
          where: { id: request.params.id },
          data: { admin: { connect: { id: toUserId } } },
        }),
      ]);

      const loaded = await loadRoomDetail(fastify, request.params.id, request.user.id);
      return reply.send({
        success: true,
        data: serializeRoomDetail(loaded!.room, loaded!.myRole),
      });
    },
  );

  // GET /rooms/:id/members
  fastify.get<{ Params: { id: string } }>(
    '/rooms/:id/members',
    { schema: listMembersSchema, preHandler: requireMembership },
    async (request, reply) => {
      const members = await fastify.prisma.membership.findMany({
        where: { roomId: request.params.id },
        include: { user: true },
        orderBy: { joinedAt: 'asc' },
      });
      return reply.send({ success: true, data: members.map(serializeMember) });
    },
  );

  // PATCH /rooms/:id/members/:userId
  fastify.patch<{
    Params: { id: string; userId: string };
    Body: { target?: number; includeInCurrentCycle?: boolean | null };
  }>(
    '/rooms/:id/members/:userId',
    { schema: patchMemberSchema, preHandler: requireAdmin },
    async (request, reply) => {
      const existing = await fastify.prisma.membership.findUnique({
        where: {
          roomId_userId: { roomId: request.params.id, userId: request.params.userId },
        },
      });
      if (!existing) return reply.notFound('Member not found');

      const member = await fastify.prisma.membership.update({
        where: {
          roomId_userId: { roomId: request.params.id, userId: request.params.userId },
        },
        data: {
          ...(request.body.target !== undefined && { target: request.body.target }),
          ...(request.body.includeInCurrentCycle !== undefined && {
            includeInCurrentCycle: request.body.includeInCurrentCycle,
          }),
        },
        include: { user: true },
      });
      return reply.send({ success: true, data: serializeMember(member) });
    },
  );

  // DELETE /rooms/:id/members/:userId
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/rooms/:id/members/:userId',
    { schema: removeMemberSchema, preHandler: requireAdmin },
    async (request, reply) => {
      if (request.params.userId === request.user.id) {
        return reply.badRequest('Use leave or transfer-admin instead');
      }
      const existing = await fastify.prisma.membership.findUnique({
        where: {
          roomId_userId: { roomId: request.params.id, userId: request.params.userId },
        },
      });
      if (!existing) return reply.notFound('Member not found');

      await fastify.prisma.membership.update({
        where: {
          roomId_userId: { roomId: request.params.id, userId: request.params.userId },
        },
        data: { leftAt: new Date() },
      });
      return reply.send({ success: true, message: 'Member removed' });
    },
  );

  // POST /rooms/:id/leave
  fastify.post<{ Params: { id: string } }>(
    '/rooms/:id/leave',
    { schema: leaveRoomSchema, preHandler: requireMembership },
    async (request, reply) => {
      if (request.membership?.role === 'admin') {
        return reply.forbidden(
          'Transfer admin rights before leaving (PRD 6.3)',
        );
      }
      await fastify.prisma.membership.update({
        where: {
          roomId_userId: { roomId: request.params.id, userId: request.user.id },
        },
        data: { leftAt: new Date() },
      });
      return reply.send({ success: true, message: 'You left the room' });
    },
  );
}
