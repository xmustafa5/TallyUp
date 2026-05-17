import type { FastifyInstance } from 'fastify';
import type { Invitation, Room, User } from '@prisma/client';
import { notify } from '../../../notifications/domain/services/notification.service';
import {
  sendInvitationSchema,
  incomingInvitationsSchema,
  outgoingInvitationsSchema,
  respondInvitationSchema,
} from '../schemas/invitations.schemas';

type InvitationFull = Invitation & { room: Room; from: User; to: User };

function serialize(inv: InvitationFull) {
  return {
    id: inv.id,
    roomId: inv.roomId,
    roomName: inv.room.name,
    status: inv.status,
    from: {
      id: inv.from.id,
      publicId: inv.from.publicId,
      displayName: inv.from.displayName,
      avatarUrl: inv.from.avatarUrl ?? null,
    },
    to: {
      id: inv.to.id,
      publicId: inv.to.publicId,
      displayName: inv.to.displayName,
      avatarUrl: inv.to.avatarUrl ?? null,
    },
    createdAt: inv.createdAt.toISOString(),
  };
}

const fullInclude = { room: true, from: true, to: true } as const;

export default async function invitationsRoutes(fastify: FastifyInstance) {
  // POST /invitations
  fastify.post<{ Body: { roomId: string; toPublicId: string } }>(
    '/invitations',
    { schema: sendInvitationSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const { roomId, toPublicId } = request.body;

      const admin = await fastify.prisma.membership.findUnique({
        where: { roomId_userId: { roomId, userId: request.user.id } },
      });
      if (!admin || admin.leftAt) return reply.notFound('Room not found');
      if (admin.role !== 'admin') {
        return reply.forbidden('Only the room admin can invite members');
      }

      const invitee = await fastify.prisma.user.findUnique({
        where: { publicId: toPublicId },
      });
      if (!invitee) return reply.notFound('No user with that User ID');
      if (invitee.id === request.user.id) {
        return reply.badRequest('You cannot invite yourself');
      }

      const existingMember = await fastify.prisma.membership.findUnique({
        where: { roomId_userId: { roomId, userId: invitee.id } },
      });
      if (existingMember && !existingMember.leftAt) {
        return reply.conflict('User is already a member of this room');
      }

      const pending = await fastify.prisma.invitation.findFirst({
        where: { roomId, toUserId: invitee.id, status: 'pending' },
      });
      if (pending) {
        return reply.conflict('An invitation is already pending for this user');
      }

      const invitation = await fastify.prisma.invitation.create({
        data: {
          room: { connect: { id: roomId } },
          from: { connect: { id: request.user.id } },
          to: { connect: { id: invitee.id } },
        },
        include: fullInclude,
      });

      await notify(fastify.prisma, fastify.queues?.default, {
        userId: invitee.id,
        type: 'invitation_received',
        payload: {
          invitationId: invitation.id,
          roomId,
          roomName: invitation.room.name,
          fromDisplayName: invitation.from.displayName,
        },
        push: {
          title: 'New room invitation',
          body: `${invitation.from.displayName} invited you to ${invitation.room.name}`,
        },
      });

      return reply.code(201).send({ success: true, data: serialize(invitation) });
    },
  );

  // GET /invitations/incoming
  fastify.get(
    '/invitations/incoming',
    { schema: incomingInvitationsSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const rows = await fastify.prisma.invitation.findMany({
        where: { toUserId: request.user.id, status: 'pending' },
        include: fullInclude,
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ success: true, data: rows.map(serialize) });
    },
  );

  // GET /invitations/outgoing/:roomId
  fastify.get<{ Params: { roomId: string } }>(
    '/invitations/outgoing/:roomId',
    { schema: outgoingInvitationsSchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const admin = await fastify.prisma.membership.findUnique({
        where: {
          roomId_userId: { roomId: request.params.roomId, userId: request.user.id },
        },
      });
      if (!admin || admin.leftAt) return reply.notFound('Room not found');
      if (admin.role !== 'admin') {
        return reply.forbidden('Only the room admin can view sent invitations');
      }

      const rows = await fastify.prisma.invitation.findMany({
        where: { roomId: request.params.roomId, status: 'pending' },
        include: fullInclude,
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ success: true, data: rows.map(serialize) });
    },
  );

  // POST /invitations/:id/accept
  fastify.post<{ Params: { id: string } }>(
    '/invitations/:id/accept',
    {
      schema: respondInvitationSchema(
        'Accept an invitation',
        'Accept an invitation and join the room. If a cycle is already running you are flagged as a late joiner (PRD 6.2); the admin then chooses whether to include you this cycle.',
      ),
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const invitation = await fastify.prisma.invitation.findUnique({
        where: { id: request.params.id },
        include: { ...fullInclude, room: { include: { currentCycle: true } } },
      });
      if (!invitation || invitation.toUserId !== request.user.id) {
        return reply.notFound('Invitation not found');
      }
      if (invitation.status !== 'pending') {
        return reply.badRequest('Invitation is no longer pending');
      }

      const cycleActive =
        invitation.room.status === 'active' && invitation.room.currentCycleId != null;

      await fastify.prisma.$transaction([
        fastify.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted', respondedAt: new Date() },
        }),
        fastify.prisma.membership.upsert({
          where: {
            roomId_userId: {
              roomId: invitation.roomId,
              userId: request.user.id,
            },
          },
          create: {
            room: { connect: { id: invitation.roomId } },
            user: { connect: { id: request.user.id } },
            role: 'member',
            target: 1,
            joinedLate: cycleActive,
          },
          update: { leftAt: null, joinedLate: cycleActive },
        }),
      ]);

      await notify(fastify.prisma, fastify.queues?.default, {
        userId: invitation.fromUserId,
        type: 'invitation_accepted',
        payload: {
          roomId: invitation.roomId,
          roomName: invitation.room.name,
          byDisplayName: invitation.to.displayName,
        },
        push: {
          title: 'Invitation accepted',
          body: `${invitation.to.displayName} joined ${invitation.room.name}`,
        },
      });

      const fresh = await fastify.prisma.invitation.findUnique({
        where: { id: invitation.id },
        include: fullInclude,
      });
      return reply.send({ success: true, data: serialize(fresh!) });
    },
  );

  // POST /invitations/:id/reject
  fastify.post<{ Params: { id: string } }>(
    '/invitations/:id/reject',
    {
      schema: respondInvitationSchema(
        'Reject an invitation',
        'Decline a pending invitation addressed to you.',
      ),
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const invitation = await fastify.prisma.invitation.findUnique({
        where: { id: request.params.id },
        include: fullInclude,
      });
      if (!invitation || invitation.toUserId !== request.user.id) {
        return reply.notFound('Invitation not found');
      }
      if (invitation.status !== 'pending') {
        return reply.badRequest('Invitation is no longer pending');
      }

      const updated = await fastify.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'rejected', respondedAt: new Date() },
        include: fullInclude,
      });
      return reply.send({ success: true, data: serialize(updated) });
    },
  );

  // POST /invitations/:id/cancel
  fastify.post<{ Params: { id: string } }>(
    '/invitations/:id/cancel',
    {
      schema: respondInvitationSchema(
        'Cancel an invitation',
        'Cancel an invitation you sent (inviter only) while it is still pending.',
      ),
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const invitation = await fastify.prisma.invitation.findUnique({
        where: { id: request.params.id },
        include: fullInclude,
      });
      if (!invitation || invitation.fromUserId !== request.user.id) {
        return reply.notFound('Invitation not found');
      }
      if (invitation.status !== 'pending') {
        return reply.badRequest('Invitation is no longer pending');
      }

      const updated = await fastify.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'cancelled', respondedAt: new Date() },
        include: fullInclude,
      });
      return reply.send({ success: true, data: serialize(updated) });
    },
  );
}
