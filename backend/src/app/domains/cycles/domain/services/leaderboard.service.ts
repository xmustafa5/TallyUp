import type { PrismaClient } from '@prisma/client';

export interface LeaderboardRow {
  userId: string;
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  target: number;
  percent: number;
}

/**
 * Compute the leaderboard for a cycle: sum of non-undone check-in points
 * per active member, joined with member targets and public profile.
 * Sorted by percent desc, then points desc. Pure read.
 */
export async function buildLeaderboard(
  prisma: PrismaClient,
  cycleId: string,
  roomId: string,
  cycleStartsAt: Date,
): Promise<LeaderboardRow[]> {
  const [memberships, checkIns] = await Promise.all([
    prisma.membership.findMany({
      where: {
        roomId,
        OR: [{ leftAt: null }, { leftAt: { gt: cycleStartsAt } }],
      },
      include: {
        user: { select: { publicId: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.checkIn.groupBy({
      by: ['userId'],
      where: { cycleId, undoneAt: null },
      _sum: { points: true },
    }),
  ]);

  const pointsByUser = new Map<string, number>();
  for (const row of checkIns) {
    pointsByUser.set(row.userId, row._sum.points ?? 0);
  }

  const rows: LeaderboardRow[] = memberships.map((m) => {
    const points = pointsByUser.get(m.userId) ?? 0;
    const percent =
      m.target > 0 ? Math.min(100, Math.round((points / m.target) * 100)) : 0;
    return {
      userId: m.userId,
      publicId: m.user.publicId,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl ?? null,
      points,
      target: m.target,
      percent,
    };
  });

  rows.sort((a, b) => b.percent - a.percent || b.points - a.points);
  return rows;
}
