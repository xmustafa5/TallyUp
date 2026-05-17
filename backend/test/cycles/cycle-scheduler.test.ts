import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  computeNextEndsAt,
  computeFirstCycleWindow,
} from '../../src/app/domains/cycles/domain/services/cycle-scheduler.service';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('computeNextEndsAt: durations', () => {
  it('week = start + 7 days (exact ms, no DST in window)', () => {
    const start = new Date('2026-06-01T10:00:00.000Z');
    const end = computeNextEndsAt({
      period: 'week',
      customDays: null,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    expect(end.getTime() - start.getTime()).toBe(7 * DAY_MS);
  });

  it('custom = start + customDays days', () => {
    const start = new Date('2026-06-01T10:00:00.000Z');
    const end = computeNextEndsAt({
      period: 'custom',
      customDays: 21,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    expect(end.getTime() - start.getTime()).toBe(21 * DAY_MS);
  });

  it('custom with null customDays falls back to 1 day', () => {
    const start = new Date('2026-06-01T10:00:00.000Z');
    const end = computeNextEndsAt({
      period: 'custom',
      customDays: null,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    expect(end.getTime() - start.getTime()).toBe(DAY_MS);
  });

  it('oneshot = start + customDays days (null -> 1)', () => {
    const start = new Date('2026-06-01T10:00:00.000Z');
    const end10 = computeNextEndsAt({
      period: 'oneshot',
      customDays: 10,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    expect(end10.getTime() - start.getTime()).toBe(10 * DAY_MS);

    const endNull = computeNextEndsAt({
      period: 'oneshot',
      customDays: null,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    expect(endNull.getTime() - start.getTime()).toBe(DAY_MS);
  });

  it('month lands exactly one calendar month later in the room tz', () => {
    const start = new Date('2026-06-15T12:00:00.000Z');
    const end = computeNextEndsAt({
      period: 'month',
      customDays: null,
      roomTimezone: 'America/New_York',
      cycleStartsAt: start,
    });

    const startNy = DateTime.fromJSDate(start, { zone: 'America/New_York' });
    const endNy = DateTime.fromJSDate(end, { zone: 'America/New_York' });

    // Same day-of-month and wall-clock time, one month later, in NY.
    expect(endNy.year).toBe(startNy.year);
    expect(endNy.month).toBe(startNy.month + 1);
    expect(endNy.day).toBe(startNy.day);
    expect(endNy.hour).toBe(startNy.hour);
    expect(endNy.minute).toBe(startNy.minute);
  });
});

describe('computeNextEndsAt: February month-length clamping', () => {
  it('Jan 31 + 1 month clamps to Feb 28 (2026 is not a leap year)', () => {
    // Jan 31 2026, 00:00 in UTC.
    const start = new Date('2026-01-31T00:00:00.000Z');
    const end = computeNextEndsAt({
      period: 'month',
      customDays: null,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    const endUtc = DateTime.fromJSDate(end, { zone: 'UTC' });
    expect(endUtc.month).toBe(2);
    expect(endUtc.day).toBe(28);
  });

  it('Jan 31 + 1 month clamps to Feb 29 in a leap year (2028)', () => {
    const start = new Date('2028-01-31T00:00:00.000Z');
    const end = computeNextEndsAt({
      period: 'month',
      customDays: null,
      roomTimezone: 'UTC',
      cycleStartsAt: start,
    });
    const endUtc = DateTime.fromJSDate(end, { zone: 'UTC' });
    expect(endUtc.month).toBe(2);
    expect(endUtc.day).toBe(29);
  });
});

describe('computeFirstCycleWindow: startAtNextBoundary = false', () => {
  it('startsAt equals now exactly', () => {
    const now = new Date('2026-05-17T08:30:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'week',
      customDays: null,
      startDayOfWeek: 1,
      startDayOfMonth: null,
      roomTimezone: 'America/New_York',
      now,
      startAtNextBoundary: false,
    });

    expect(win.startsAt.getTime()).toBe(now.getTime());
    expect(win.endsAt.getTime() - win.startsAt.getTime()).toBe(7 * DAY_MS);
  });

  it('custom period ignores boundary and starts at now', () => {
    const now = new Date('2026-05-17T08:30:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'custom',
      customDays: 10,
      startDayOfWeek: null,
      startDayOfMonth: null,
      roomTimezone: 'UTC',
      now,
      startAtNextBoundary: true, // no boundary concept for custom
    });

    expect(win.startsAt.getTime()).toBe(now.getTime());
    expect(win.endsAt.getTime() - win.startsAt.getTime()).toBe(10 * DAY_MS);
  });
});

describe('computeFirstCycleWindow: weekly boundary alignment', () => {
  it('aligns startsAt to the next configured weekday at 00:00 in room tz', () => {
    // 2026-05-17 is a Sunday. Pick startDayOfWeek = 1 (Monday).
    // Next Monday in America/New_York is 2026-05-18 00:00 -04:00.
    const now = new Date('2026-05-17T15:00:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'week',
      customDays: null,
      startDayOfWeek: 1, // Monday
      startDayOfMonth: null,
      roomTimezone: 'America/New_York',
      now,
      startAtNextBoundary: true,
    });

    const startNy = DateTime.fromJSDate(win.startsAt, { zone: 'America/New_York' });
    expect(startNy.weekday).toBe(1); // Monday (luxon 1=Mon)
    expect(startNy.hour).toBe(0);
    expect(startNy.minute).toBe(0);
    expect(startNy.toISODate()).toBe('2026-05-18');
    // Strictly after now
    expect(win.startsAt.getTime()).toBeGreaterThan(now.getTime());
    // 1 week long
    expect(win.endsAt.getTime() - win.startsAt.getTime()).toBe(7 * DAY_MS);
  });

  it('maps Sunday input (0) to luxon weekday 7', () => {
    // now Sunday 2026-05-17; next Sunday boundary is 2026-05-24.
    const now = new Date('2026-05-17T15:00:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'week',
      customDays: null,
      startDayOfWeek: 0, // Sunday
      startDayOfMonth: null,
      roomTimezone: 'UTC',
      now,
      startAtNextBoundary: true,
    });

    const startUtc = DateTime.fromJSDate(win.startsAt, { zone: 'UTC' });
    expect(startUtc.weekday).toBe(7); // Sunday in luxon
    expect(startUtc.toISODate()).toBe('2026-05-24');
    expect(startUtc.hour).toBe(0);
  });

  it('falls back to now when startDayOfWeek is null', () => {
    const now = new Date('2026-05-17T15:00:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'week',
      customDays: null,
      startDayOfWeek: null,
      startDayOfMonth: null,
      roomTimezone: 'UTC',
      now,
      startAtNextBoundary: true,
    });
    expect(win.startsAt.getTime()).toBe(now.getTime());
  });
});

describe('computeFirstCycleWindow: monthly boundary alignment', () => {
  it('aligns to the next configured day-of-month at 00:00 in room tz', () => {
    // now 2026-05-17; next day-of-month 1 is 2026-06-01 00:00 UTC.
    const now = new Date('2026-05-17T15:00:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'month',
      customDays: null,
      startDayOfWeek: null,
      startDayOfMonth: 1,
      roomTimezone: 'UTC',
      now,
      startAtNextBoundary: true,
    });

    const startUtc = DateTime.fromJSDate(win.startsAt, { zone: 'UTC' });
    expect(startUtc.toISODate()).toBe('2026-06-01');
    expect(startUtc.hour).toBe(0);
    expect(win.startsAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('clamps a day-of-month that exceeds the next month length', () => {
    // now 2026-01-15; configured day 31. Current month (Jan) still has a
    // future 31st, so it should align to Jan 31.
    const jan = new Date('2026-01-15T12:00:00.000Z');
    const winJan = computeFirstCycleWindow({
      period: 'month',
      customDays: null,
      startDayOfWeek: null,
      startDayOfMonth: 31,
      roomTimezone: 'UTC',
      now: jan,
      startAtNextBoundary: true,
    });
    expect(
      DateTime.fromJSDate(winJan.startsAt, { zone: 'UTC' }).toISODate(),
    ).toBe('2026-01-31');

    // now 2026-02-01; configured day 31. February 2026 has only 28 days,
    // so it clamps to Feb 28.
    const feb = new Date('2026-02-01T12:00:00.000Z');
    const winFeb = computeFirstCycleWindow({
      period: 'month',
      customDays: null,
      startDayOfWeek: null,
      startDayOfMonth: 31,
      roomTimezone: 'UTC',
      now: feb,
      startAtNextBoundary: true,
    });
    expect(
      DateTime.fromJSDate(winFeb.startsAt, { zone: 'UTC' }).toISODate(),
    ).toBe('2026-02-28');
  });

  it('falls back to now when startDayOfMonth is null', () => {
    const now = new Date('2026-05-17T15:00:00.000Z');
    const win = computeFirstCycleWindow({
      period: 'month',
      customDays: null,
      startDayOfWeek: null,
      startDayOfMonth: null,
      roomTimezone: 'UTC',
      now,
      startAtNextBoundary: true,
    });
    expect(win.startsAt.getTime()).toBe(now.getTime());
  });
});

describe('computeNextEndsAt: DST handling (America/New_York)', () => {
  it('preserves local wall-clock time across US spring-forward (+7 days)', () => {
    // US spring-forward 2026: 2026-03-08 02:00 -> 03:00 local (NY).
    // Start on 2026-03-06 09:00 NY time, which is EST (UTC-5) = 14:00 UTC.
    const startNy = DateTime.fromObject(
      { year: 2026, month: 3, day: 6, hour: 9 },
      { zone: 'America/New_York' },
    );
    expect(startNy.offset).toBe(-300); // EST (UTC-5)
    const start = startNy.toUTC().toJSDate();

    const end = computeNextEndsAt({
      period: 'week',
      customDays: null,
      roomTimezone: 'America/New_York',
      cycleStartsAt: start,
    });

    const endNy = DateTime.fromJSDate(end, { zone: 'America/New_York' });

    // Local wall-clock time is preserved (still 09:00 on Mar 13).
    expect(endNy.hour).toBe(9);
    expect(endNy.minute).toBe(0);
    expect(endNy.toISODate()).toBe('2026-03-13');
    // ...but the UTC offset changed (now EDT, UTC-4).
    expect(endNy.offset).toBe(-240);
    expect(startNy.offset).not.toBe(endNy.offset);

    // Because a DST hour was skipped, the real elapsed time is 7 days
    // minus 1 hour even though the wall clock advanced exactly 7 days.
    expect(end.getTime() - start.getTime()).toBe(7 * DAY_MS - 60 * 60 * 1000);
  });
});
