import type { Prisma, PrismaClient } from '@prisma/client';
import { BADGE_CATALOG } from './badge-catalog';

/**
 * Idempotently upsert the static badge catalog. Called once at startup.
 */
export async function seedBadgeCatalog(prisma: PrismaClient): Promise<void> {
  for (const b of BADGE_CATALOG) {
    await prisma.badge.upsert({
      where: { code: b.code },
      create: b,
      update: { name: b.name, icon: b.icon },
    });
  }
}

type Tx = Prisma.TransactionClient;

export interface ScoredMember {
  userId: string;
  points: number;
  target: number;
}

export interface StreakBadgeOutcome {
  /** userIds that newly earned at least one badge this cycle. */
  badgedUserIds: string[];
  /** code list keyed by userId for notification payloads. */
  earnedByUser: Map<string, string[]>;
}

/**
 * Update streaks and award badges for a finished cycle. MUST be called
 * inside the cycle-end transaction (which is guarded on
 * `cycle.status === 'active'`), so it runs exactly once per cycle and is
 * therefore idempotent. Badge awards additionally rely on the
 * `@@unique([userId, badgeId])` constraint as a final guard.
 *
 * Streak rule (PRD 3.x / 7.2): a user's streak increments by 1 for each
 * consecutive cycle in which they reached their target; missing target
 * resets `current` to 0. `best` is the running maximum. Both a global
 * streak (`roomId = null`) and a per-room streak are tracked.
 *
 * Badges awarded:
 *  - `first_win`     : user is in the cycle's winners list for the first time
 *  - `first_target`  : user reached their target for the first time
 *  - `streak_3/5/10` : global streak reached 3 / 5 / 10
 */
export async function applyStreaksAndBadges(
  tx: Tx,
  cycleId: string,
  roomId: string,
  scores: ScoredMember[],
  winnerUserIds: Set<string>,
): Promise<StreakBadgeOutcome> {
  const earnedByUser = new Map<string, string[]>();

  // Resolve badge ids once.
  const badges = await tx.badge.findMany();
  const badgeIdByCode = new Map(badges.map((b) => [b.code, b.id]));

  async function award(userId: string, code: string) {
    const badgeId = badgeIdByCode.get(code);
    if (!badgeId) return;
    const existing = await tx.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (existing) return;
    await tx.userBadge.create({
      data: {
        user: { connect: { id: userId } },
        badge: { connect: { id: badgeId } },
        cycleId,
      },
    });
    const list = earnedByUser.get(userId) ?? [];
    list.push(code);
    earnedByUser.set(userId, list);
  }

  async function bumpStreak(
    userId: string,
    scopeRoomId: string | null,
    reached: boolean,
  ): Promise<number> {
    // Prisma rejects `null` inside a compound unique for
    // findUnique/upsert, so use findFirst + explicit create/update.
    const prev = await tx.userStreak.findFirst({
      where: { userId, roomId: scopeRoomId },
    });
    const current = reached ? (prev?.current ?? 0) + 1 : 0;
    const best = Math.max(prev?.best ?? 0, current);
    if (prev) {
      await tx.userStreak.update({
        where: { id: prev.id },
        data: { current, best },
      });
    } else {
      await tx.userStreak.create({
        data: {
          user: { connect: { id: userId } },
          roomId: scopeRoomId,
          current,
          best,
        },
      });
    }
    return current;
  }

  for (const s of scores) {
    const reached = s.points >= s.target;

    // Per-room + global streaks.
    const globalCurrent = await bumpStreak(s.userId, null, reached);
    await bumpStreak(s.userId, roomId, reached);

    if (reached) await award(s.userId, 'first_target');
    if (winnerUserIds.has(s.userId)) await award(s.userId, 'first_win');
    if (globalCurrent >= 10) await award(s.userId, 'streak_10');
    else if (globalCurrent >= 5) await award(s.userId, 'streak_5');
    else if (globalCurrent >= 3) await award(s.userId, 'streak_3');
  }

  return {
    badgedUserIds: [...earnedByUser.keys()],
    earnedByUser,
  };
}
