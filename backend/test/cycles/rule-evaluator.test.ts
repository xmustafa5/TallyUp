import { describe, it, expect } from 'vitest';
import {
  evaluate,
  type Score,
  type RuleSnapshot,
} from '../../src/app/domains/cycles/domain/services/rule-evaluator.service';

const noRules: RuleSnapshot = {
  winnerRule: 'none',
  winnerN: null,
  loserRule: 'none',
  loserN: null,
};

describe('rule-evaluator: scores ordering', () => {
  it('sorts scores by points DESC, stable for equal points, without mutating input', () => {
    const scores: Score[] = [
      { userId: 'a', points: 5, target: 10 },
      { userId: 'b', points: 9, target: 10 },
      { userId: 'c', points: 5, target: 10 },
      { userId: 'd', points: 7, target: 10 },
    ];
    const snapshot = JSON.stringify(scores);

    const result = evaluate(scores, noRules, 4);

    expect(result.scores.map((s) => s.userId)).toEqual(['b', 'd', 'a', 'c']);
    // input array not mutated
    expect(JSON.stringify(scores)).toBe(snapshot);
    // result.scores is a different array reference
    expect(result.scores).not.toBe(scores);
  });
});

describe('rule-evaluator: highest wins + lowest loses', () => {
  it('picks a clear single winner and single loser', () => {
    const scores: Score[] = [
      { userId: 'ali', points: 8, target: 4 },
      { userId: 'ahmed', points: 5, target: 4 },
      { userId: 'mustafa', points: 2, target: 10 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'highest',
      winnerN: null,
      loserRule: 'lowest',
      loserN: null,
    };

    const result = evaluate(scores, rules, 3);

    expect(result.winners).toEqual([{ userId: 'ali', reason: 'Most points' }]);
    expect(result.losers).toEqual([{ userId: 'mustafa', reason: 'Fewest points' }]);
    expect(result.winnerRuleApplied).toBe('highest');
    expect(result.loserRuleApplied).toBe('lowest');
    expect(result.tieBreakRequired).toBeUndefined();
    expect(result.loserSkippedDueToOverlap).toBeUndefined();
  });
});

describe('rule-evaluator: highest wins with a 2-way tie at the top', () => {
  it('includes both tied users as winners and flags highest_tie', () => {
    const scores: Score[] = [
      { userId: 'a', points: 9, target: 5 },
      { userId: 'b', points: 9, target: 5 },
      { userId: 'c', points: 3, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'highest',
      winnerN: null,
      loserRule: 'none',
      loserN: null,
    };

    const result = evaluate(scores, rules, 3);

    expect(result.winners.map((w) => w.userId).sort()).toEqual(['a', 'b']);
    expect(result.tieBreakRequired).toEqual({
      kind: 'highest_tie',
      tiedUserIds: ['a', 'b'],
    });
  });
});

describe('rule-evaluator: lowest wins with tie -> lowest_tie', () => {
  it('includes both tied lowest users as winners and flags lowest_tie', () => {
    const scores: Score[] = [
      { userId: 'a', points: 9, target: 5 },
      { userId: 'b', points: 2, target: 5 },
      { userId: 'c', points: 2, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'lowest',
      winnerN: null,
      loserRule: 'none',
      loserN: null,
    };

    const result = evaluate(scores, rules, 3);

    expect(result.winners.map((w) => w.userId).sort()).toEqual(['b', 'c']);
    expect(result.winners.every((w) => w.reason === 'Fewest points')).toBe(true);
    expect(result.tieBreakRequired).toEqual({
      kind: 'lowest_tie',
      tiedUserIds: ['b', 'c'],
    });
  });
});

describe('rule-evaluator: top_n with boundary tie', () => {
  it('flags winner_boundary with ALL users sharing the boundary score', () => {
    // Sorted DESC: f(10), a(8), b(8), c(8), d(3). Top 2 cut is between
    // index 1 (8) and index 2 (8) -> boundary tie at points=8.
    const scores: Score[] = [
      { userId: 'a', points: 8, target: 5 },
      { userId: 'b', points: 8, target: 5 },
      { userId: 'c', points: 8, target: 5 },
      { userId: 'd', points: 3, target: 5 },
      { userId: 'f', points: 10, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'top_n',
      winnerN: 2,
      loserRule: 'none',
      loserN: null,
    };

    const result = evaluate(scores, rules, 5);

    // Deterministic first-2 by sorted order: f then a.
    expect(result.winners).toEqual([
      { userId: 'f', reason: 'Top 2' },
      { userId: 'a', reason: 'Top 2' },
    ]);
    expect(result.tieBreakRequired?.kind).toBe('winner_boundary');
    expect(result.tieBreakRequired?.tiedUserIds.sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not flag a tie when the boundary is clean', () => {
    const scores: Score[] = [
      { userId: 'a', points: 10, target: 5 },
      { userId: 'b', points: 8, target: 5 },
      { userId: 'c', points: 6, target: 5 },
      { userId: 'd', points: 3, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'top_n',
      winnerN: 2,
      loserRule: 'none',
      loserN: null,
    };

    const result = evaluate(scores, rules, 4);

    expect(result.winners.map((w) => w.userId)).toEqual(['a', 'b']);
    expect(result.tieBreakRequired).toBeUndefined();
  });
});

describe('rule-evaluator: threshold wins and threshold loses', () => {
  it('winners = points >= own target, losers = points < own target', () => {
    const scores: Score[] = [
      { userId: 'ali', points: 4, target: 4 }, // exactly meets -> winner
      { userId: 'ahmed', points: 6, target: 4 }, // above -> winner
      { userId: 'mustafa', points: 6, target: 10 }, // below -> loser
      { userId: 'sara', points: 0, target: 3 }, // below -> loser
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'threshold',
      winnerN: null,
      loserRule: 'threshold',
      loserN: null,
    };

    const result = evaluate(scores, rules, 4);

    expect(result.winners.map((w) => w.userId).sort()).toEqual(['ahmed', 'ali']);
    expect(result.winners.every((w) => w.reason === 'Reached target')).toBe(true);
    expect(result.losers.map((l) => l.userId).sort()).toEqual(['mustafa', 'sara']);
    expect(result.losers.every((l) => l.reason === 'Did not reach target')).toBe(true);
    // threshold rules never produce ties
    expect(result.tieBreakRequired).toBeUndefined();
  });

  it('threshold can produce zero winners or zero losers', () => {
    const scores: Score[] = [
      { userId: 'a', points: 1, target: 5 },
      { userId: 'b', points: 2, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'threshold',
      winnerN: null,
      loserRule: 'none',
      loserN: null,
    };

    const result = evaluate(scores, rules, 2);
    expect(result.winners).toEqual([]);
    expect(result.losers).toEqual([]);
  });
});

describe('rule-evaluator: none / none', () => {
  it('produces empty winners and losers', () => {
    const scores: Score[] = [
      { userId: 'a', points: 9, target: 5 },
      { userId: 'b', points: 1, target: 5 },
    ];

    const result = evaluate(scores, noRules, 2);

    expect(result.winners).toEqual([]);
    expect(result.losers).toEqual([]);
    expect(result.winnerRuleApplied).toBe('none');
    expect(result.loserRuleApplied).toBe('none');
    expect(result.tieBreakRequired).toBeUndefined();
    expect(result.loserSkippedDueToOverlap).toBeUndefined();
  });
});

describe('rule-evaluator: overlap (winner precedence)', () => {
  it('removes a top_n winner from the highest-loses list and flags overlap', () => {
    // Top 2 win + highest loses. The highest (a) is also a top-2 winner,
    // so a must be removed from losers and loserSkippedDueToOverlap=true.
    const scores: Score[] = [
      { userId: 'a', points: 10, target: 5 },
      { userId: 'b', points: 7, target: 5 },
      { userId: 'c', points: 2, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'top_n',
      winnerN: 2,
      loserRule: 'highest',
      loserN: null,
    };

    const result = evaluate(scores, rules, 3);

    expect(result.winners.map((w) => w.userId)).toEqual(['a', 'b']);
    // a was the only "highest loses" candidate -> filtered out -> empty losers
    expect(result.losers).toEqual([]);
    expect(result.loserSkippedDueToOverlap).toBe(true);
  });

  it('does not set the overlap flag when there is no overlap', () => {
    const scores: Score[] = [
      { userId: 'a', points: 10, target: 5 },
      { userId: 'b', points: 7, target: 5 },
      { userId: 'c', points: 2, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'highest',
      winnerN: null,
      loserRule: 'lowest',
      loserN: null,
    };

    const result = evaluate(scores, rules, 3);

    expect(result.winners.map((w) => w.userId)).toEqual(['a']);
    expect(result.losers.map((l) => l.userId)).toEqual(['c']);
    expect(result.loserSkippedDueToOverlap).toBeUndefined();
  });
});

describe('rule-evaluator: bottom_n loses', () => {
  it('selects the lowest N (ascending) with no boundary tie', () => {
    const scores: Score[] = [
      { userId: 'a', points: 10, target: 5 },
      { userId: 'b', points: 7, target: 5 },
      { userId: 'c', points: 3, target: 5 },
      { userId: 'd', points: 1, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'none',
      winnerN: null,
      loserRule: 'bottom_n',
      loserN: 2,
    };

    const result = evaluate(scores, rules, 4);

    // ascending: d(1), c(3) -> bottom 2
    expect(result.losers).toEqual([
      { userId: 'd', reason: 'Bottom 2' },
      { userId: 'c', reason: 'Bottom 2' },
    ]);
    expect(result.tieBreakRequired).toBeUndefined();
  });

  it('flags loser_boundary on a bottom_n boundary tie', () => {
    // ascending: a(1), b(1), c(1), d(9). bottom 2 cut sits inside the 1s.
    const scores: Score[] = [
      { userId: 'a', points: 1, target: 5 },
      { userId: 'b', points: 1, target: 5 },
      { userId: 'c', points: 1, target: 5 },
      { userId: 'd', points: 9, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'none',
      winnerN: null,
      loserRule: 'bottom_n',
      loserN: 2,
    };

    const result = evaluate(scores, rules, 4);

    expect(result.losers.map((l) => l.userId)).toEqual(['a', 'b']);
    expect(result.tieBreakRequired?.kind).toBe('loser_boundary');
    expect(result.tieBreakRequired?.tiedUserIds.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('rule-evaluator: invalid N is clamped (no throw)', () => {
  it('clamps top_n N >= memberCount to memberCount-1', () => {
    const scores: Score[] = [
      { userId: 'a', points: 10, target: 5 },
      { userId: 'b', points: 8, target: 5 },
      { userId: 'c', points: 6, target: 5 },
    ];
    const rules: RuleSnapshot = {
      winnerRule: 'top_n',
      winnerN: 5, // invalid: >= memberCount (3)
      loserRule: 'none',
      loserN: null,
    };

    expect(() => evaluate(scores, rules, 3)).not.toThrow();
    const result = evaluate(scores, rules, 3);
    // clamped to memberCount-1 = 2
    expect(result.winners.map((w) => w.userId)).toEqual(['a', 'b']);
    expect(result.winners.every((w) => w.reason === 'Top 2')).toBe(true);
  });

  it('clamps null / negative N defensively and never throws', () => {
    const scores: Score[] = [
      { userId: 'a', points: 10, target: 5 },
      { userId: 'b', points: 8, target: 5 },
      { userId: 'c', points: 6, target: 5 },
    ];

    const nullN: RuleSnapshot = {
      winnerRule: 'top_n',
      winnerN: null,
      loserRule: 'bottom_n',
      loserN: -3,
    };

    expect(() => evaluate(scores, nullN, 3)).not.toThrow();
    const result = evaluate(scores, nullN, 3);
    // null winnerN -> clamp to 1 -> top 1 = a
    expect(result.winners.map((w) => w.userId)).toEqual(['a']);
    // negative loserN -> clamp to 1 -> bottom 1 = c
    expect(result.losers.map((l) => l.userId)).toEqual(['c']);
  });

  it('yields an empty list when memberCount <= 1 makes N invalid', () => {
    const scores: Score[] = [{ userId: 'a', points: 10, target: 5 }];
    const rules: RuleSnapshot = {
      winnerRule: 'top_n',
      winnerN: 1,
      loserRule: 'bottom_n',
      loserN: 1,
    };

    const result = evaluate(scores, rules, 1);
    expect(result.winners).toEqual([]);
    expect(result.losers).toEqual([]);
  });
});

describe('rule-evaluator: empty scores', () => {
  it('handles an empty score list without throwing', () => {
    const rules: RuleSnapshot = {
      winnerRule: 'highest',
      winnerN: null,
      loserRule: 'lowest',
      loserN: null,
    };

    const result = evaluate([], rules, 0);
    expect(result.scores).toEqual([]);
    expect(result.winners).toEqual([]);
    expect(result.losers).toEqual([]);
  });
});
