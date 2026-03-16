import { describe, it, expect } from 'vitest';
import { DailyTracker } from '../../../src/app/domains/daily-tracker/domain/entities/daily-tracker.entity';
import {
  determineMissedPrayers,
  shouldUpdateStreak,
} from '../../../src/app/domains/daily-tracker/domain/services/daily-tracker.service';

describe('DailyTracker Entity', () => {
  const baseProps = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '660e8400-e29b-41d4-a716-446655440000',
    date: new Date('2024-06-15T00:00:00.000Z'),
    fajr: true,
    dhuhr: false,
    asr: true,
    maghrib: false,
    isha: true,
    isFinalized: false,
    createdAt: new Date('2024-06-15T06:00:00.000Z'),
    updatedAt: new Date('2024-06-15T18:00:00.000Z'),
  };

  describe('fromPrisma', () => {
    it('should create instance from Prisma data', () => {
      const tracker = DailyTracker.fromPrisma(baseProps);
      expect(tracker.id).toBe(baseProps.id);
      expect(tracker.userId).toBe(baseProps.userId);
      expect(tracker.date).toEqual(baseProps.date);
      expect(tracker.isFinalized).toBe(false);
    });
  });

  describe('toResponse', () => {
    it('should convert to response format with correct types', () => {
      const tracker = DailyTracker.fromPrisma(baseProps);
      const response = tracker.toResponse();

      expect(response.id).toBe(baseProps.id);
      expect(response.date).toBe('2024-06-15');
      expect(response.fajr).toBe(true);
      expect(response.dhuhr).toBe(false);
      expect(response.asr).toBe(true);
      expect(response.maghrib).toBe(false);
      expect(response.isha).toBe(true);
      expect(response.isFinalized).toBe(false);
      expect(response.createdAt).toBe('2024-06-15T06:00:00.000Z');
      expect(response.updatedAt).toBe('2024-06-15T18:00:00.000Z');
    });

    it('should format date as YYYY-MM-DD string', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        date: new Date('2024-01-01T00:00:00.000Z'),
      });
      expect(tracker.toResponse().date).toBe('2024-01-01');
    });
  });

  describe('getMissedPrayers', () => {
    it('should return empty array when all prayers are completed', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      });
      expect(tracker.getMissedPrayers()).toEqual([]);
    });

    it('should return all prayers when none are completed', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      });
      expect(tracker.getMissedPrayers()).toEqual([
        'FAJR',
        'DHUHR',
        'ASR',
        'MAGHRIB',
        'ISHA',
      ]);
    });

    it('should return only missed prayers', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: true,
        dhuhr: false,
        asr: true,
        maghrib: false,
        isha: true,
      });
      expect(tracker.getMissedPrayers()).toEqual(['DHUHR', 'MAGHRIB']);
    });

    it('should return single missed prayer', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: false,
      });
      expect(tracker.getMissedPrayers()).toEqual(['ISHA']);
    });
  });

  describe('getCompletedCount', () => {
    it('should return 0 when no prayers are completed', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      });
      expect(tracker.getCompletedCount()).toBe(0);
    });

    it('should return 5 when all prayers are completed', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      });
      expect(tracker.getCompletedCount()).toBe(5);
    });

    it('should return correct count for partial completion', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: true,
        dhuhr: false,
        asr: true,
        maghrib: false,
        isha: true,
      });
      expect(tracker.getCompletedCount()).toBe(3);
    });

    it('should return 1 for single prayer completed', () => {
      const tracker = DailyTracker.fromPrisma({
        ...baseProps,
        fajr: true,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      });
      expect(tracker.getCompletedCount()).toBe(1);
    });
  });
});

describe('determineMissedPrayers', () => {
  it('should return empty array when all prayers completed', () => {
    const result = determineMissedPrayers({
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    });
    expect(result).toEqual([]);
  });

  it('should return all prayer types when none completed', () => {
    const result = determineMissedPrayers({
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    });
    expect(result).toEqual(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']);
  });

  it('should return only missed prayer types', () => {
    const result = determineMissedPrayers({
      fajr: true,
      dhuhr: false,
      asr: true,
      maghrib: true,
      isha: false,
    });
    expect(result).toEqual(['DHUHR', 'ISHA']);
  });

  it('should return single missed prayer', () => {
    const result = determineMissedPrayers({
      fajr: false,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    });
    expect(result).toEqual(['FAJR']);
  });
});

describe('shouldUpdateStreak', () => {
  it('should increment when no previous activity (first day)', () => {
    const today = new Date('2024-06-15T00:00:00.000Z');
    const result = shouldUpdateStreak(null, today);
    expect(result).toEqual({ increment: true, reset: false });
  });

  it('should increment when last active was yesterday', () => {
    const lastActive = new Date('2024-06-14T00:00:00.000Z');
    const today = new Date('2024-06-15T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: true, reset: false });
  });

  it('should not change when last active is same day', () => {
    const lastActive = new Date('2024-06-15T00:00:00.000Z');
    const today = new Date('2024-06-15T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: false, reset: false });
  });

  it('should reset when gap is more than 1 day', () => {
    const lastActive = new Date('2024-06-12T00:00:00.000Z');
    const today = new Date('2024-06-15T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: false, reset: true });
  });

  it('should reset when gap is exactly 2 days', () => {
    const lastActive = new Date('2024-06-13T00:00:00.000Z');
    const today = new Date('2024-06-15T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: false, reset: true });
  });

  it('should handle month boundary (consecutive days)', () => {
    const lastActive = new Date('2024-01-31T00:00:00.000Z');
    const today = new Date('2024-02-01T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: true, reset: false });
  });

  it('should handle year boundary (consecutive days)', () => {
    const lastActive = new Date('2023-12-31T00:00:00.000Z');
    const today = new Date('2024-01-01T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: true, reset: false });
  });

  it('should handle month boundary with gap', () => {
    const lastActive = new Date('2024-01-30T00:00:00.000Z');
    const today = new Date('2024-02-01T00:00:00.000Z');
    const result = shouldUpdateStreak(lastActive, today);
    expect(result).toEqual({ increment: false, reset: true });
  });
});
