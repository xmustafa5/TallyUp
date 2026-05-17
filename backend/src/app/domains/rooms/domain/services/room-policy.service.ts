export type PeriodType = 'week' | 'month' | 'custom' | 'oneshot';
export type WinnerRule = 'none' | 'highest' | 'lowest' | 'top_n' | 'threshold';
export type LoserRule = 'none' | 'lowest' | 'highest' | 'bottom_n' | 'threshold';

export interface RoomConfig {
  periodType: PeriodType;
  customDays?: number | null;
  startDayOfWeek?: number | null;
  startDayOfMonth?: number | null;
  winnerRule: WinnerRule;
  winnerN?: number | null;
  loserRule: LoserRule;
  loserN?: number | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a room's period + rule configuration. Pure -- returns the list
 * of problems (empty = valid). Membership-count-dependent checks (e.g.
 * Top N requires N < memberCount) are enforced at start time, not here,
 * since members can still be added while the room is in draft.
 */
export function validateRoomConfig(config: RoomConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (config.periodType) {
    case 'custom':
    case 'oneshot':
      if (
        config.customDays == null ||
        !Number.isInteger(config.customDays) ||
        config.customDays < 1 ||
        config.customDays > 365
      ) {
        errors.push({
          field: 'customDays',
          message: 'customDays must be an integer between 1 and 365',
        });
      }
      break;
    case 'week':
      if (
        config.startDayOfWeek != null &&
        (!Number.isInteger(config.startDayOfWeek) ||
          config.startDayOfWeek < 0 ||
          config.startDayOfWeek > 6)
      ) {
        errors.push({
          field: 'startDayOfWeek',
          message: 'startDayOfWeek must be 0 (Sun) to 6 (Sat)',
        });
      }
      break;
    case 'month':
      if (
        config.startDayOfMonth != null &&
        (!Number.isInteger(config.startDayOfMonth) ||
          config.startDayOfMonth < 1 ||
          config.startDayOfMonth > 28)
      ) {
        errors.push({
          field: 'startDayOfMonth',
          message: 'startDayOfMonth must be 1 to 28',
        });
      }
      break;
  }

  if (config.winnerRule === 'top_n') {
    if (config.winnerN == null || !Number.isInteger(config.winnerN) || config.winnerN < 1) {
      errors.push({ field: 'winnerN', message: 'winnerN must be a positive integer' });
    }
  }

  if (config.loserRule === 'bottom_n') {
    if (config.loserN == null || !Number.isInteger(config.loserN) || config.loserN < 1) {
      errors.push({ field: 'loserN', message: 'loserN must be a positive integer' });
    }
  }

  return errors;
}

/**
 * Membership-count-dependent validation, run at start time. Top N / Bottom
 * N must be strictly less than the number of members (PRD 2.4.4).
 */
export function validateRuleAgainstMemberCount(
  config: Pick<RoomConfig, 'winnerRule' | 'winnerN' | 'loserRule' | 'loserN'>,
  memberCount: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (config.winnerRule === 'top_n' && (config.winnerN ?? 0) >= memberCount) {
    errors.push({
      field: 'winnerN',
      message: `Top ${config.winnerN} requires more than ${config.winnerN} members`,
    });
  }
  if (config.loserRule === 'bottom_n' && (config.loserN ?? 0) >= memberCount) {
    errors.push({
      field: 'loserN',
      message: `Bottom ${config.loserN} requires more than ${config.loserN} members`,
    });
  }
  return errors;
}
