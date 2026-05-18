import type { CycleResult, RuleParticipant } from './rule-evaluator.service';

export type TieBreakChoice =
  | { pick: 'include_all' }
  | { pick: 'manual'; winners?: string[]; losers?: string[] };

/**
 * Apply an admin's tie-break decision to a stored CycleResult.
 *
 * Pure -- takes the evaluated result (which carries `tieBreakRequired`)
 * and returns a finalized result with `tieBreakRequired` cleared.
 *
 * - `include_all`: every tied user is kept on the side the tie affected
 *   (winner_boundary/highest_tie -> winners; loser_boundary/lowest_tie ->
 *   losers). This is already the evaluator's default, so it simply clears
 *   the flag.
 * - `manual`: replace the affected side's membership among the tied users
 *   with exactly the admin's explicit picks (only ids that were actually
 *   tied are honoured; others are ignored defensively).
 */
export function applyTieBreak(
  result: CycleResult,
  choice: TieBreakChoice,
): CycleResult {
  const tb = result.tieBreakRequired;
  if (!tb) return result;

  const tied = new Set(tb.tiedUserIds);
  const affectsWinners =
    tb.kind === 'winner_boundary' || tb.kind === 'highest_tie';

  if (choice.pick === 'include_all') {
    return { ...result, tieBreakRequired: undefined };
  }

  // Manual: keep non-tied participants as-is; among tied users keep only
  // the admin's explicit selection for the affected side.
  const reasonFor = (list: RuleParticipant[]) =>
    list.find((p) => p.userId)?.reason ?? 'Tie-break';

  if (affectsWinners) {
    const keptNonTied = result.winners.filter((w) => !tied.has(w.userId));
    const reason = reasonFor(result.winners);
    const picked = (choice.winners ?? [])
      .filter((id) => tied.has(id))
      .map((userId) => ({ userId, reason }));
    return {
      ...result,
      winners: [...keptNonTied, ...picked],
      tieBreakRequired: undefined,
    };
  }

  const keptNonTied = result.losers.filter((l) => !tied.has(l.userId));
  const reason = reasonFor(result.losers);
  const picked = (choice.losers ?? [])
    .filter((id) => tied.has(id))
    .map((userId) => ({ userId, reason }));
  return {
    ...result,
    losers: [...keptNonTied, ...picked],
    tieBreakRequired: undefined,
  };
}
