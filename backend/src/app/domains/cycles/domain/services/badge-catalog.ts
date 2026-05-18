/**
 * Static badge catalog. Seeded into the `badges` table at startup
 * (idempotent upsert by `code`). Codes are stable identifiers used by
 * the award logic; name/icon are display-only and may be localized
 * client-side off the code.
 */
export interface BadgeDef {
  code: string;
  name: string;
  icon: string;
}

export const BADGE_CATALOG: readonly BadgeDef[] = [
  { code: 'first_win', name: 'First Win', icon: '🥇' },
  { code: 'first_target', name: 'On Target', icon: '🎯' },
  { code: 'streak_3', name: '3 in a Row', icon: '🔥' },
  { code: 'streak_5', name: '5 in a Row', icon: '⚡' },
  { code: 'streak_10', name: 'Unstoppable', icon: '🏆' },
] as const;
