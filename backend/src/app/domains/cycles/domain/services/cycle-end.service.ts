import type { FastifyInstance } from 'fastify';
import {
  evaluate,
  type Score,
  type RuleSnapshot,
  type CycleResult,
} from './rule-evaluator.service';
import {
  computeNextEndsAt,
  scheduleCycleEnd,
  scheduleCycleReminders,
} from './cycle-lifecycle.service';
import type { PeriodType } from './cycle-scheduler.service';
import { notify } from '../../../notifications/domain/services/notification.service';

interface StoredRuleSnapshot extends RuleSnapshot {
  periodType: PeriodType;
  customDays: number | null;
  capAtTarget: boolean;
}

/**
 * Process the end of a cycle. EXACTLY-ONCE / idempotent: the whole read +
 * status flip happens in a transaction guarded on `status === 'active'`.
 * A replayed job that finds the cycle already `ended` returns immediately.
 *
 * Steps (PRD 4.5, 2.4, 6.2):
 *  1. Load cycle (guard active), room, active memberships, non-undone check-ins.
 *  2. Sum points per user, cap at target when room.capAtTarget.
 *  3. Drop members who joined late and were not opted in to this cycle.
 *  4. Evaluate winner/loser rules from the cycle's own snapshot.
 *  5. Persist result + status=ended.
 *  6. If repeating period and room still active -> create next cycle + reschedule.
 *     Else (oneshot) -> archive room.
 *  7. Notify every affected member (in-app + push).
 */
export async function processCycleEnd(
  fastify: FastifyInstance,
  cycleId: string,
): Promise<{ processed: boolean; result?: CycleResult }> {
  const prisma = fastify.prisma;

  const prepared = await prisma.$transaction(async (tx) => {
    const cycle = await tx.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle || cycle.status !== 'active') return null;

    const room = await tx.room.findUnique({ where: { id: cycle.roomId } });
    if (!room) return null;

    const memberships = await tx.membership.findMany({
      where: {
        roomId: room.id,
        OR: [{ leftAt: null }, { leftAt: { gt: cycle.startsAt } }],
      },
    });

    const checkIns = await tx.checkIn.findMany({
      where: { cycleId: cycle.id, undoneAt: null },
      select: { userId: true, points: true },
    });

    const snapshot = cycle.ruleSnapshot as unknown as StoredRuleSnapshot;

    // Sum points per user.
    const rawByUser = new Map<string, number>();
    for (const ci of checkIns) {
      rawByUser.set(ci.userId, (rawByUser.get(ci.userId) ?? 0) + ci.points);
    }

    // Build the score list, filtering out late joiners not opted in.
    const scores: Score[] = [];
    for (const m of memberships) {
      if (m.joinedLate && m.includeInCurrentCycle !== true) continue;
      const raw = rawByUser.get(m.userId) ?? 0;
      const points = snapshot.capAtTarget ? Math.min(raw, m.target) : raw;
      scores.push({ userId: m.userId, points, target: m.target });
    }

    const result = evaluate(
      scores,
      {
        winnerRule: snapshot.winnerRule,
        winnerN: snapshot.winnerN,
        loserRule: snapshot.loserRule,
        loserN: snapshot.loserN,
      },
      scores.length,
    );

    await tx.cycle.update({
      where: { id: cycle.id },
      data: { status: 'ended', resultJson: result as unknown as object },
    });

    return { cycle, room, snapshot, result };
  });

  if (!prepared) return { processed: false };

  const { cycle, room, snapshot, result } = prepared;
  const isRepeating = snapshot.periodType !== 'oneshot';

  // Create the next cycle (repeating) or archive the room (oneshot).
  if (isRepeating && room.status === 'active') {
    const nextStartsAt = cycle.endsAt;
    const nextEndsAt = computeNextEndsAt({
      period: snapshot.periodType,
      customDays: snapshot.customDays,
      roomTimezone: room.timezone,
      cycleStartsAt: nextStartsAt,
    });

    // Re-snapshot from the LIVE room so rule edits made mid-cycle take
    // effect now (PRD 6.5).
    const freshRoom = await prisma.room.findUnique({ where: { id: room.id } });
    const nextSnapshot = {
      winnerRule: freshRoom!.winnerRule,
      winnerN: freshRoom!.winnerN,
      loserRule: freshRoom!.loserRule,
      loserN: freshRoom!.loserN,
      periodType: freshRoom!.periodType,
      customDays: freshRoom!.customDays,
      capAtTarget: freshRoom!.capAtTarget,
    };

    const next = await prisma.cycle.create({
      data: {
        room: { connect: { id: room.id } },
        cycleNumber: cycle.cycleNumber + 1,
        startsAt: nextStartsAt,
        endsAt: nextEndsAt,
        status: 'active',
        ruleSnapshot: nextSnapshot,
      },
    });

    const endJobId = await scheduleCycleEnd(fastify, next.id, room.id, nextEndsAt);
    await scheduleCycleReminders(fastify, next.id, nextStartsAt, nextEndsAt);
    await prisma.room.update({
      where: { id: room.id },
      data: { currentCycle: { connect: { id: next.id } } },
    });
    if (endJobId) {
      await prisma.cycle.update({ where: { id: next.id }, data: { endJobId } });
    }
  } else if (!isRepeating) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'archived' },
    });
  }

  // Notify every member who was scored this cycle.
  const queue = fastify.queues?.default;
  const winnerIds = new Set(result.winners.map((w) => w.userId));
  const loserIds = new Set(result.losers.map((l) => l.userId));

  for (const s of result.scores) {
    const outcome = winnerIds.has(s.userId)
      ? 'won'
      : loserIds.has(s.userId)
        ? 'lost'
        : 'ended';
    await notify(prisma, queue, {
      userId: s.userId,
      type: 'cycle_ended',
      payload: {
        roomId: room.id,
        roomName: room.name,
        cycleId: cycle.id,
        outcome,
      },
      push: {
        title: `${room.name}: cycle ended`,
        body:
          outcome === 'won'
            ? 'You won this cycle!'
            : outcome === 'lost'
              ? 'You lost this cycle.'
              : 'The cycle has ended. See the results.',
      },
    });
  }

  return { processed: true, result };
}
