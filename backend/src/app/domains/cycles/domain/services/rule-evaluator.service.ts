/**
 * TallyUp end-of-cycle rule evaluator.
 *
 * This module is the single source of truth for deciding who wins and who
 * loses a challenge cycle. It implements PRD section 2.4 (Rules) including the
 * tie-breaker detection (2.4.4) and the winner-precedence overlap rule.
 *
 * It is a PURE domain service: no I/O, no external dependencies, no mutation
 * of its inputs. Given the same inputs it always produces the same output.
 */

/** A single member's score for the cycle. */
export type Score = { userId: string; points: number; target: number };

/**
 * The frozen view of a room's configured rules at the moment the cycle ends.
 * `winnerN` / `loserN` are only meaningful for the `top_n` / `bottom_n` rules.
 */
export interface RuleSnapshot {
  winnerRule: 'none' | 'highest' | 'lowest' | 'top_n' | 'threshold';
  winnerN: number | null;
  loserRule: 'none' | 'lowest' | 'highest' | 'bottom_n' | 'threshold';
  loserN: number | null;
}

/** A member who ended up in the winners or losers list, with a short reason. */
export interface RuleParticipant {
  userId: string;
  reason: string;
}

/**
 * Emitted when human disambiguation is required at the result boundary.
 * The admin then chooses to include all tied members or pick manually.
 */
export interface TieBreak {
  kind: 'winner_boundary' | 'loser_boundary' | 'highest_tie' | 'lowest_tie';
  tiedUserIds: string[];
}

/** The full computed outcome of a cycle. */
export interface CycleResult {
  /** Input scores sorted by points DESC (stable for equal points). */
  scores: Score[];
  winners: RuleParticipant[];
  losers: RuleParticipant[];
  /** Echo of the winner rule actually applied (e.g. 'highest', 'none'). */
  winnerRuleApplied: string;
  /** Echo of the loser rule actually applied. */
  loserRuleApplied: string;
  /** True only if the loser list lost members due to winner-precedence overlap. */
  loserSkippedDueToOverlap?: boolean;
  /** Set when a boundary / extreme tie needs admin disambiguation. */
  tieBreakRequired?: TieBreak;
}

/**
 * Stable sort by points descending.
 *
 * `Array.prototype.sort` is spec-stable in modern engines (Node 22), but we
 * keep an explicit index tiebreaker so equal-point members deterministically
 * preserve their original input order regardless of engine.
 */
function sortByPointsDesc(scores: Score[]): Score[] {
  return scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => {
      if (b.score.points !== a.score.points) {
        return b.score.points - a.score.points;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.score);
}

/**
 * Stable sort by points ascending (for the losing side).
 *
 * This is NOT a reverse of the descending sort: among members with equal
 * points the ORIGINAL input order is preserved, so `bottom_n` selection is
 * deterministic and symmetric with `top_n` (first N in input order at the
 * boundary score), rather than flipping tied members.
 */
function sortByPointsAsc(scores: Score[]): Score[] {
  return scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => {
      if (a.score.points !== b.score.points) {
        return a.score.points - b.score.points;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.score);
}

/**
 * Clamp an admin-configured N defensively.
 *
 * PRD 2.4.4 requires N to be strictly less than the member count. We never
 * throw: an invalid N (null, < 1, or >= memberCount) is clamped to the valid
 * range [1, memberCount - 1]. If memberCount <= 1 there is no valid N and the
 * caller should treat the rule as yielding an empty list.
 */
function clampN(n: number | null, memberCount: number): number | null {
  if (memberCount <= 1) {
    return null;
  }
  const maxN = memberCount - 1;
  const requested = n == null || !Number.isFinite(n) ? 1 : Math.trunc(n);
  return Math.min(Math.max(1, requested), maxN);
}

/** All userIds whose points equal the given value, in sorted order. */
function userIdsAtPoints(sorted: Score[], points: number): string[] {
  return sorted.filter((s) => s.points === points).map((s) => s.userId);
}

/**
 * Evaluate the cycle outcome.
 *
 * @param scores      Each member's points and personal target for the cycle.
 * @param rules       The frozen winner/loser rule configuration.
 * @param memberCount The number of members the rules were configured against.
 */
export function evaluate(scores: Score[], rules: RuleSnapshot, memberCount: number): CycleResult {
  // Never mutate the caller's array; sorted view is points DESC, stable.
  const sorted = sortByPointsDesc(scores);

  let winners: RuleParticipant[] = [];
  let losers: RuleParticipant[] = [];
  let tieBreakRequired: TieBreak | undefined;

  // ---------------------------------------------------------------------------
  // Winner rule
  // ---------------------------------------------------------------------------
  switch (rules.winnerRule) {
    case 'highest': {
      if (sorted.length > 0) {
        const maxPoints = sorted[0].points;
        const tied = userIdsAtPoints(sorted, maxPoints);
        winners = tied.map((userId) => ({ userId, reason: 'Most points' }));
        if (tied.length > 1) {
          tieBreakRequired = { kind: 'highest_tie', tiedUserIds: tied };
        }
      }
      break;
    }
    case 'lowest': {
      if (sorted.length > 0) {
        const minPoints = sorted[sorted.length - 1].points;
        const tied = userIdsAtPoints(sorted, minPoints);
        winners = tied.map((userId) => ({ userId, reason: 'Fewest points' }));
        if (tied.length > 1) {
          tieBreakRequired = { kind: 'lowest_tie', tiedUserIds: tied };
        }
      }
      break;
    }
    case 'top_n': {
      const n = clampN(rules.winnerN, memberCount);
      if (n != null && n > 0 && sorted.length > 0) {
        const take = Math.min(n, sorted.length);
        winners = sorted
          .slice(0, take)
          .map((s) => ({ userId: s.userId, reason: `Top ${n}` }));
        // Boundary tie: the score at the cut equals the score just past it.
        if (take < sorted.length && sorted[take - 1].points === sorted[take].points) {
          const boundaryPoints = sorted[take - 1].points;
          tieBreakRequired = {
            kind: 'winner_boundary',
            tiedUserIds: userIdsAtPoints(sorted, boundaryPoints),
          };
        }
      }
      break;
    }
    case 'threshold': {
      // Anyone who reached their own personal target wins. No ties possible.
      winners = sorted
        .filter((s) => s.points >= s.target)
        .map((s) => ({ userId: s.userId, reason: 'Reached target' }));
      break;
    }
    case 'none':
    default: {
      winners = [];
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // Loser rule (mirrors the winner rule on the losing side)
  // ---------------------------------------------------------------------------
  switch (rules.loserRule) {
    case 'lowest': {
      if (sorted.length > 0) {
        const minPoints = sorted[sorted.length - 1].points;
        const tied = userIdsAtPoints(sorted, minPoints);
        losers = tied.map((userId) => ({ userId, reason: 'Fewest points' }));
        if (tied.length > 1) {
          // A loser extreme tie only needs a tie-breaker if the winner rule
          // did not already raise one (single tieBreakRequired channel).
          tieBreakRequired ??= { kind: 'lowest_tie', tiedUserIds: tied };
        }
      }
      break;
    }
    case 'highest': {
      if (sorted.length > 0) {
        const maxPoints = sorted[0].points;
        const tied = userIdsAtPoints(sorted, maxPoints);
        losers = tied.map((userId) => ({ userId, reason: 'Most points' }));
        if (tied.length > 1) {
          tieBreakRequired ??= { kind: 'highest_tie', tiedUserIds: tied };
        }
      }
      break;
    }
    case 'bottom_n': {
      const n = clampN(rules.loserN, memberCount);
      if (n != null && n > 0 && sorted.length > 0) {
        // Stable ascending order built from the original input so tied
        // members keep their input order (symmetric with top_n).
        const ascending = sortByPointsAsc(scores);
        const take = Math.min(n, ascending.length);
        losers = ascending
          .slice(0, take)
          .map((s) => ({ userId: s.userId, reason: `Bottom ${n}` }));
        if (take < ascending.length && ascending[take - 1].points === ascending[take].points) {
          const boundaryPoints = ascending[take - 1].points;
          tieBreakRequired ??= {
            kind: 'loser_boundary',
            tiedUserIds: userIdsAtPoints(sorted, boundaryPoints),
          };
        }
      }
      break;
    }
    case 'threshold': {
      // Anyone who did not reach their own personal target loses.
      losers = sorted
        .filter((s) => s.points < s.target)
        .map((s) => ({ userId: s.userId, reason: 'Did not reach target' }));
      break;
    }
    case 'none':
    default: {
      losers = [];
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // Overlap rule (PRD 2.4.4): a user cannot be both winner and loser.
  // Winner takes precedence -- overlapping users are removed from losers.
  // ---------------------------------------------------------------------------
  const winnerIds = new Set(winners.map((w) => w.userId));
  const filteredLosers = losers.filter((l) => !winnerIds.has(l.userId));
  const loserSkippedDueToOverlap = filteredLosers.length !== losers.length;
  losers = filteredLosers;

  const result: CycleResult = {
    scores: sorted,
    winners,
    losers,
    winnerRuleApplied: rules.winnerRule,
    loserRuleApplied: rules.loserRule,
  };

  if (loserSkippedDueToOverlap) {
    result.loserSkippedDueToOverlap = true;
  }
  if (tieBreakRequired) {
    result.tieBreakRequired = tieBreakRequired;
  }

  return result;
}
