import { DateTime } from 'luxon';

export const MAX_CHECK_INS_PER_DAY = 50;
export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Compute the UTC start-of-day instant for "now" in the room's timezone.
 * Used to count a user's check-ins within the current local day for the
 * 50/day rate limit (PRD 6.5).
 */
export function startOfRoomDay(roomTimezone: string, now: Date = new Date()): Date {
  return DateTime.fromJSDate(now)
    .setZone(roomTimezone)
    .startOf('day')
    .toUTC()
    .toJSDate();
}

/**
 * Apply the cap-at-target rule. Returns the number of points that may
 * actually be recorded: when the room caps at target, a check-in cannot
 * push the user past their target. Returns 0 when already at/over target.
 */
export function applyCap(
  requestedPoints: number,
  currentSum: number,
  target: number,
  capAtTarget: boolean,
): number {
  if (!capAtTarget) return requestedPoints;
  const remaining = target - currentSum;
  if (remaining <= 0) return 0;
  return Math.min(requestedPoints, remaining);
}

/**
 * Whether a check-in created at `createdAt` is still within the 24h undo
 * window (PRD 6.5).
 */
export function isWithinUndoWindow(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < UNDO_WINDOW_MS;
}
