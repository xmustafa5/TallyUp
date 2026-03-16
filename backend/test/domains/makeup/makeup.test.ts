import { describe, it, expect } from 'vitest';
import { MakeupLog } from '../../../src/app/domains/makeup/domain/entities/makeup-log.entity';
import { logMakeupPrayer, getStats } from '../../../src/app/domains/makeup/domain/services/makeup.service';

describe('MakeupLog Entity', () => {
  const sampleDate = new Date('2024-06-15T10:30:00.000Z');
  const sampleCreatedAt = new Date('2024-06-15T10:30:05.000Z');

  const sampleProps = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    userId: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890',
    prayerType: 'FAJR' as const,
    source: 'MANUAL' as const,
    completedAt: sampleDate,
    createdAt: sampleCreatedAt,
  };

  describe('fromPrisma', () => {
    it('should create a MakeupLog instance from Prisma data', () => {
      const log = MakeupLog.fromPrisma(sampleProps);
      expect(log).toBeInstanceOf(MakeupLog);
      expect(log.id).toBe(sampleProps.id);
      expect(log.userId).toBe(sampleProps.userId);
      expect(log.prayerType).toBe('FAJR');
      expect(log.source).toBe('MANUAL');
    });

    it('should handle all prayer types', () => {
      const types = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;
      for (const prayerType of types) {
        const log = MakeupLog.fromPrisma({ ...sampleProps, prayerType });
        expect(log.prayerType).toBe(prayerType);
      }
    });

    it('should handle all source types', () => {
      const sources = ['MANUAL', 'GAP_PERIOD', 'DAILY_MISSED'] as const;
      for (const source of sources) {
        const log = MakeupLog.fromPrisma({ ...sampleProps, source });
        expect(log.source).toBe(source);
      }
    });
  });

  describe('toResponse', () => {
    it('should return a response object with ISO date strings', () => {
      const log = MakeupLog.fromPrisma(sampleProps);
      const response = log.toResponse();

      expect(response.id).toBe(sampleProps.id);
      expect(response.prayerType).toBe('FAJR');
      expect(response.source).toBe('MANUAL');
      expect(response.completedAt).toBe('2024-06-15T10:30:00.000Z');
      expect(response.createdAt).toBe('2024-06-15T10:30:05.000Z');
    });

    it('should not include userId in the response', () => {
      const log = MakeupLog.fromPrisma(sampleProps);
      const response = log.toResponse();

      expect(response).not.toHaveProperty('userId');
    });
  });
});

describe('Makeup Service', () => {
  describe('logMakeupPrayer', () => {
    it('should return valid create data for a valid prayer type', () => {
      const result = logMakeupPrayer({
        userId: 'user-123',
        prayerType: 'FAJR',
      });

      expect(result.userId).toBe('user-123');
      expect(result.prayerType).toBe('FAJR');
      expect(result.source).toBe('MANUAL');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should default source to MANUAL when not provided', () => {
      const result = logMakeupPrayer({
        userId: 'user-123',
        prayerType: 'DHUHR',
      });

      expect(result.source).toBe('MANUAL');
    });

    it('should use provided source when specified', () => {
      const result = logMakeupPrayer({
        userId: 'user-123',
        prayerType: 'ASR',
        source: 'GAP_PERIOD',
      });

      expect(result.source).toBe('GAP_PERIOD');
    });

    it('should set completedAt to approximately now', () => {
      const before = new Date();
      const result = logMakeupPrayer({
        userId: 'user-123',
        prayerType: 'MAGHRIB',
      });
      const after = new Date();

      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept all valid prayer types', () => {
      const types = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;
      for (const prayerType of types) {
        const result = logMakeupPrayer({ userId: 'user-123', prayerType });
        expect(result.prayerType).toBe(prayerType);
      }
    });

    it('should throw for an invalid prayer type', () => {
      expect(() =>
        logMakeupPrayer({
          userId: 'user-123',
          prayerType: 'INVALID' as any,
        }),
      ).toThrow('Invalid prayer type: INVALID');
    });
  });

  describe('getStats', () => {
    it('should return correct stats with no completed prayers', () => {
      const completedCounts: Record<string, number> = {};
      const balance = { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 };

      const stats = getStats(completedCounts, balance);

      expect(stats.perType.fajr).toEqual({ completed: 0, remaining: 10 });
      expect(stats.perType.dhuhr).toEqual({ completed: 0, remaining: 10 });
      expect(stats.perType.asr).toEqual({ completed: 0, remaining: 10 });
      expect(stats.perType.maghrib).toEqual({ completed: 0, remaining: 10 });
      expect(stats.perType.isha).toEqual({ completed: 0, remaining: 10 });
      expect(stats.totalCompleted).toBe(0);
      expect(stats.totalRemaining).toBe(50);
    });

    it('should return correct stats with some completed prayers', () => {
      const completedCounts: Record<string, number> = {
        FAJR: 3,
        DHUHR: 5,
        ASR: 2,
      };
      const balance = { fajr: 7, dhuhr: 5, asr: 8, maghrib: 10, isha: 10 };

      const stats = getStats(completedCounts, balance);

      expect(stats.perType.fajr).toEqual({ completed: 3, remaining: 7 });
      expect(stats.perType.dhuhr).toEqual({ completed: 5, remaining: 5 });
      expect(stats.perType.asr).toEqual({ completed: 2, remaining: 8 });
      expect(stats.perType.maghrib).toEqual({ completed: 0, remaining: 10 });
      expect(stats.perType.isha).toEqual({ completed: 0, remaining: 10 });
      expect(stats.totalCompleted).toBe(10);
      expect(stats.totalRemaining).toBe(40);
    });

    it('should handle all prayers completed (zero remaining)', () => {
      const completedCounts: Record<string, number> = {
        FAJR: 10,
        DHUHR: 10,
        ASR: 10,
        MAGHRIB: 10,
        ISHA: 10,
      };
      const balance = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

      const stats = getStats(completedCounts, balance);

      expect(stats.totalCompleted).toBe(50);
      expect(stats.totalRemaining).toBe(0);
      expect(stats.perType.fajr).toEqual({ completed: 10, remaining: 0 });
    });

    it('should handle zero balance and zero completed', () => {
      const completedCounts: Record<string, number> = {};
      const balance = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

      const stats = getStats(completedCounts, balance);

      expect(stats.totalCompleted).toBe(0);
      expect(stats.totalRemaining).toBe(0);
    });
  });
});
