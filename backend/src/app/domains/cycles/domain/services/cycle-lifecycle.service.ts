import type { FastifyInstance } from 'fastify';
import type { Room } from '@prisma/client';
import {
  computeFirstCycleWindow,
  computeNextEndsAt,
  type PeriodType,
} from './cycle-scheduler.service';

/**
 * Snapshot of a room's rule + period config taken at the moment a cycle
 * starts. Rule edits on the room apply only to the NEXT cycle (PRD 6.5);
 * the active cycle always evaluates against its own snapshot.
 */
export function buildRuleSnapshot(room: Room) {
  return {
    winnerRule: room.winnerRule,
    winnerN: room.winnerN,
    loserRule: room.loserRule,
    loserN: room.loserN,
    periodType: room.periodType,
    customDays: room.customDays,
    capAtTarget: room.capAtTarget,
  };
}

/**
 * Schedule the delayed BullMQ job that ends a cycle at `endsAt`. Returns
 * the job id so it can be stored on the cycle (for cancellation on pause).
 * No-ops (returns null) when queues are unavailable (test env / no Redis).
 */
export async function scheduleCycleEnd(
  fastify: FastifyInstance,
  cycleId: string,
  roomId: string,
  endsAt: Date,
): Promise<string | null> {
  const queue = fastify.queues?.default;
  if (!queue) return null;

  const delay = Math.max(0, endsAt.getTime() - Date.now());
  const job = await queue.add(
    'cycle-end',
    { cycleId, roomId },
    { delay, jobId: `cycle-end-${cycleId}` },
  );
  return job.id ?? null;
}

/**
 * Create the first cycle for a room and transition it to `active`.
 * Called by POST /rooms/:id/start. Idempotent-ish: caller guarantees the
 * room is in `draft`.
 */
export async function startFirstCycle(
  fastify: FastifyInstance,
  room: Room,
  startAtNextBoundary: boolean,
): Promise<{ cycleId: string }> {
  const window = computeFirstCycleWindow({
    period: room.periodType as PeriodType,
    customDays: room.customDays,
    startDayOfWeek: room.startDayOfWeek,
    startDayOfMonth: room.startDayOfMonth,
    roomTimezone: room.timezone,
    now: new Date(),
    startAtNextBoundary,
  });

  const cycle = await fastify.prisma.cycle.create({
    data: {
      room: { connect: { id: room.id } },
      cycleNumber: 1,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      status: 'active',
      ruleSnapshot: buildRuleSnapshot(room),
    },
  });

  const endJobId = await scheduleCycleEnd(fastify, cycle.id, room.id, window.endsAt);

  await fastify.prisma.room.update({
    where: { id: room.id },
    data: {
      status: 'active',
      currentCycle: { connect: { id: cycle.id } },
      ...(endJobId ? {} : {}),
    },
  });

  if (endJobId) {
    await fastify.prisma.cycle.update({
      where: { id: cycle.id },
      data: { endJobId },
    });
  }

  return { cycleId: cycle.id };
}

export { computeNextEndsAt };
