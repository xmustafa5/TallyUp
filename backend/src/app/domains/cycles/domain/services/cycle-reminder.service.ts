import type { FastifyInstance } from 'fastify';
import { notify } from '../../../notifications/domain/services/notification.service';

type ReminderKind = 'halfway' | 'deadline';

/**
 * Fan-out a reminder for an active cycle: notify every member who is
 * still behind their target and has the matching notification
 * preference enabled (PRD 4.7). No-op if the cycle is no longer active
 * (e.g. ended early, paused) so a stale delayed job is harmless.
 */
export async function processCycleReminder(
  fastify: FastifyInstance,
  cycleId: string,
  kind: ReminderKind,
): Promise<{ notified: number }> {
  const prisma = fastify.prisma;

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== 'active') return { notified: 0 };

  const room = await prisma.room.findUnique({ where: { id: cycle.roomId } });
  if (!room || room.status !== 'active') return { notified: 0 };

  const memberships = await prisma.membership.findMany({
    where: {
      roomId: room.id,
      leftAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          notifyHalfwayBehind: true,
          notifyDeadline: true,
        },
      },
    },
  });

  const sums = await prisma.checkIn.groupBy({
    by: ['userId'],
    where: { cycleId: cycle.id, undoneAt: null },
    _sum: { points: true },
  });
  const pointsByUser = new Map<string, number>();
  for (const s of sums) pointsByUser.set(s.userId, s._sum.points ?? 0);

  const queue = fastify.queues?.default;
  let notified = 0;

  for (const m of memberships) {
    const points = pointsByUser.get(m.userId) ?? 0;
    if (points >= m.target) continue; // already met target

    const wants =
      kind === 'halfway'
        ? m.user.notifyHalfwayBehind
        : m.user.notifyDeadline;
    if (!wants) continue;

    const remaining = m.target - points;
    await notify(prisma, queue, {
      userId: m.userId,
      type:
        kind === 'halfway'
          ? 'cycle_halfway_behind'
          : 'cycle_deadline_warning',
      payload: {
        roomId: room.id,
        roomName: room.name,
        cycleId: cycle.id,
        points,
        target: m.target,
        remaining,
      },
      push: {
        title:
          kind === 'halfway'
            ? `${room.name}: halfway there`
            : `${room.name}: 24h left`,
        body:
          kind === 'halfway'
            ? `You're at ${points}/${m.target}. ${remaining} to go!`
            : `Cycle ends in 24h and you still need ${remaining} point${
                remaining === 1 ? '' : 's'
              }.`,
      },
    });
    notified++;
  }

  return { notified };
}
