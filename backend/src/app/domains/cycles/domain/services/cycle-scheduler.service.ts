/**
 * TallyUp cycle scheduler.
 *
 * Pure domain service that computes cycle start/end windows. All reasoning is
 * done in the room's IANA time zone (PRD 6.4 "Cycle boundaries follow the
 * room's time zone") and every returned value is a UTC JS `Date`.
 *
 * Only dependency: `luxon` (DST-aware, immutable date math).
 */
import { DateTime, type WeekdayNumbers } from 'luxon';

export type PeriodType = 'week' | 'month' | 'custom' | 'oneshot';

export interface ComputeEndsAtInput {
  period: PeriodType;
  customDays: number | null;
  /** IANA time zone of the room, e.g. 'America/New_York'. */
  roomTimezone: string;
  /** UTC instant the cycle began. */
  cycleStartsAt: Date;
}

export interface FirstCycleInput {
  period: PeriodType;
  customDays: number | null;
  /** 0=Sun .. 6=Sat. Used for 'week' period. */
  startDayOfWeek: number | null;
  /** 1..28. Used for 'month' period. */
  startDayOfMonth: number | null;
  roomTimezone: string;
  /** Current UTC instant. */
  now: Date;
  /** When true, align the start to the next period boundary. */
  startAtNextBoundary: boolean;
}

export interface CycleWindow {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Coerce a possibly-null/invalid day count to a safe positive integer.
 * Per spec, a null custom/oneshot duration is treated as 1 day.
 */
function safeDays(customDays: number | null): number {
  if (customDays == null || !Number.isFinite(customDays) || customDays < 1) {
    return 1;
  }
  return Math.trunc(customDays);
}

/**
 * Convert a luxon 0=Sun..6=Sat input into luxon's weekday numbering
 * (1=Mon..7=Sun). 0 (Sun) -> 7, 1 (Mon) -> 1, ... 6 (Sat) -> 6.
 */
function toLuxonWeekday(startDayOfWeek: number): WeekdayNumbers {
  const normalized = ((Math.trunc(startDayOfWeek) % 7) + 7) % 7;
  // `normalized` is mathematically constrained to 0..6; mapping 0 -> 7 yields
  // luxon's 1..7 weekday domain, so the assertion is sound.
  return (normalized === 0 ? 7 : normalized) as WeekdayNumbers;
}

/**
 * Compute the UTC `Date` when a cycle that began at `cycleStartsAt` should
 * end. The duration is added in the room's zone so that wall-clock semantics
 * (and DST transitions) are respected, then the result is returned as UTC.
 *
 * - week:    start + 7 days
 * - month:   start + 1 calendar month (luxon clamps short months)
 * - custom:  start + customDays days (null -> 1)
 * - oneshot: start + customDays days (null -> 1)
 */
export function computeNextEndsAt(input: ComputeEndsAtInput): Date {
  const start = DateTime.fromJSDate(input.cycleStartsAt, { zone: input.roomTimezone });

  let end: DateTime;
  switch (input.period) {
    case 'week':
      end = start.plus({ days: 7 });
      break;
    case 'month':
      // luxon handles month-length clamping (Jan 31 + 1 month -> Feb 28/29).
      end = start.plus({ months: 1 });
      break;
    case 'custom':
    case 'oneshot':
      end = start.plus({ days: safeDays(input.customDays) });
      break;
    default:
      // Defensive: unknown period behaves like a 1-day oneshot.
      end = start.plus({ days: 1 });
      break;
  }

  return end.toUTC().toJSDate();
}

/**
 * Find the next occurrence of `targetWeekday` (luxon 1..7) at 00:00 in
 * `zone`, strictly after `now`.
 */
function nextWeekdayStart(now: DateTime, targetWeekday: WeekdayNumbers): DateTime {
  // Candidate: that weekday within `now`'s ISO week, at midnight.
  let candidate = now.set({ weekday: targetWeekday }).startOf('day');
  // Must be strictly after `now`; otherwise jump to next week.
  while (candidate <= now) {
    candidate = candidate.plus({ weeks: 1 });
  }
  return candidate;
}

/**
 * Find the next occurrence of `targetDayOfMonth` at 00:00 in `zone`, strictly
 * after `now`. The day is clamped to the length of the candidate month so a
 * configured day of 31 lands on Feb 28/29, Apr 30, etc.
 */
function nextDayOfMonthStart(now: DateTime, targetDayOfMonth: number): DateTime {
  const desired = Math.trunc(targetDayOfMonth);

  // Try the current month first, then walk forward month by month.
  let monthCursor = now.startOf('month');
  for (let i = 0; i < 24; i += 1) {
    const clampedDay = Math.min(Math.max(1, desired), monthCursor.daysInMonth ?? 28);
    const candidate = monthCursor.set({ day: clampedDay }).startOf('day');
    if (candidate > now) {
      return candidate;
    }
    monthCursor = monthCursor.plus({ months: 1 });
  }
  // Extremely defensive fallback (should be unreachable).
  return now.plus({ months: 1 }).startOf('day');
}

/**
 * Compute the first cycle's start + end window.
 *
 * When `startAtNextBoundary` is false the cycle starts immediately at `now`.
 * When true, the start is aligned to the next week/month boundary in the
 * room's zone (custom/oneshot have no boundary concept and start at `now`).
 * The end is always derived via `computeNextEndsAt`.
 */
export function computeFirstCycleWindow(input: FirstCycleInput): CycleWindow {
  const nowZoned = DateTime.fromJSDate(input.now, { zone: input.roomTimezone });

  let startsAtZoned: DateTime;

  if (!input.startAtNextBoundary) {
    // Start right now.
    startsAtZoned = nowZoned;
  } else {
    switch (input.period) {
      case 'week': {
        if (input.startDayOfWeek == null || !Number.isFinite(input.startDayOfWeek)) {
          // No configured start day -> start now.
          startsAtZoned = nowZoned;
        } else {
          startsAtZoned = nextWeekdayStart(nowZoned, toLuxonWeekday(input.startDayOfWeek));
        }
        break;
      }
      case 'month': {
        if (input.startDayOfMonth == null || !Number.isFinite(input.startDayOfMonth)) {
          startsAtZoned = nowZoned;
        } else {
          startsAtZoned = nextDayOfMonthStart(nowZoned, input.startDayOfMonth);
        }
        break;
      }
      case 'custom':
      case 'oneshot':
      default:
        // No boundary concept for custom-day / one-shot cycles.
        startsAtZoned = nowZoned;
        break;
    }
  }

  const startsAt = startsAtZoned.toUTC().toJSDate();
  const endsAt = computeNextEndsAt({
    period: input.period,
    customDays: input.customDays,
    roomTimezone: input.roomTimezone,
    cycleStartsAt: startsAt,
  });

  return { startsAt, endsAt };
}
