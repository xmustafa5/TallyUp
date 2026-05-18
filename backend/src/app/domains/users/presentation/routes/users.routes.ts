import type { FastifyInstance } from 'fastify';
import {
  getMeSchema,
  updateMeSchema,
  lookupByPublicIdSchema,
  myHistorySchema,
  deleteMeSchema,
} from '../schemas/users.schemas';

interface StoredResult {
  winners?: { userId: string }[];
  losers?: { userId: string }[];
  scores?: { userId: string; points: number; target: number }[];
}

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

  fastify.get(
    '/me/history',
    { schema: myHistorySchema, preHandler: fastify.authenticate },
    async (request, reply) => {
      const userId = request.user.id;

      // Rooms the user belongs to (active or past membership).
      const memberships = await fastify.prisma.membership.findMany({
        where: { userId },
        select: { roomId: true },
      });
      const roomIds = memberships.map((m) => m.roomId);

      const cycles = await fastify.prisma.cycle.findMany({
        where: { roomId: { in: roomIds }, status: 'ended' },
        orderBy: { endsAt: 'desc' },
        include: { room: { select: { id: true, name: true } } },
      });

      let participations = 0;
      let wins = 0;
      let losses = 0;
      let percentSum = 0;
      let percentCount = 0;
      const recent: Array<{
        cycleId: string;
        roomId: string;
        roomName: string;
        cycleNumber: number;
        endsAt: string;
        outcome: 'won' | 'lost' | 'participated';
      }> = [];

      for (const c of cycles) {
        const result = c.resultJson as StoredResult | null;
        if (!result) continue;
        const myScore = result.scores?.find((s) => s.userId === userId);
        if (!myScore) continue; // user was not scored this cycle

        participations++;
        const won = !!result.winners?.some((w) => w.userId === userId);
        const lost = !!result.losers?.some((l) => l.userId === userId);
        if (won) wins++;
        if (lost) losses++;

        if (myScore.target > 0) {
          percentSum += Math.min(
            100,
            Math.round((myScore.points / myScore.target) * 100),
          );
          percentCount++;
        }

        if (recent.length < 20) {
          recent.push({
            cycleId: c.id,
            roomId: c.room.id,
            roomName: c.room.name,
            cycleNumber: c.cycleNumber,
            endsAt: c.endsAt.toISOString(),
            outcome: won ? 'won' : lost ? 'lost' : 'participated',
          });
        }
      }

      const [globalStreak, userBadges] = await Promise.all([
        // Prisma types `roomId` as non-null in the compound unique even
        // though the column is nullable -- use findFirst for the global
        // (roomId = null) streak.
        fastify.prisma.userStreak.findFirst({
          where: { userId, roomId: null },
        }),
        fastify.prisma.userBadge.findMany({
          where: { userId },
          orderBy: { earnedAt: 'desc' },
          include: { badge: true },
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          participations,
          wins,
          losses,
          avgPercent:
            percentCount > 0
              ? Math.round(percentSum / percentCount)
              : 0,
          currentStreak: globalStreak?.current ?? 0,
          bestStreak: globalStreak?.best ?? 0,
          badges: userBadges.map((ub) => ({
            code: ub.badge.code,
            name: ub.badge.name,
            icon: ub.badge.icon,
            earnedAt: ub.earnedAt.toISOString(),
          })),
          recent,
        },
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
