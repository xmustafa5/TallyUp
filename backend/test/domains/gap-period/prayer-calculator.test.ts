import { describe, it, expect } from 'vitest';
import {
  calculateDaysInRange,
  calculatePrayersForDays,
  resolveAgesToDates,
  mergeOverlappingPeriods,
  calculateTotalPrayers,
} from '../../../src/app/domains/gap-period/domain/services/prayer-calculator.service';
import { DateRange } from '../../../src/app/domains/gap-period/domain/value-objects/date-range';

describe('calculateDaysInRange', () => {
  it('should return 1 for same-day range', () => {
    const date = new Date('2024-01-01');
    expect(calculateDaysInRange(date, date)).toBe(1);
  });

  it('should count days inclusively', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-10');
    expect(calculateDaysInRange(start, end)).toBe(10);
  });

  it('should handle month boundaries', () => {
    const start = new Date('2024-01-30');
    const end = new Date('2024-02-02');
    expect(calculateDaysInRange(start, end)).toBe(4);
  });

  it('should handle leap year', () => {
    const start = new Date('2024-02-28');
    const end = new Date('2024-03-01');
    expect(calculateDaysInRange(start, end)).toBe(3); // Feb 28, 29, Mar 1
  });

  it('should handle full year', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    expect(calculateDaysInRange(start, end)).toBe(366); // 2024 is a leap year
  });
});

describe('calculatePrayersForDays', () => {
  it('should return 0 for 0 days', () => {
    expect(calculatePrayersForDays(0)).toBe(0);
  });

  it('should multiply days by 5', () => {
    expect(calculatePrayersForDays(1)).toBe(5);
    expect(calculatePrayersForDays(10)).toBe(50);
    expect(calculatePrayersForDays(365)).toBe(1825);
  });
});

describe('resolveAgesToDates', () => {
  it('should convert age range to date range', () => {
    const birthdate = new Date('2000-06-15');
    const result = resolveAgesToDates(birthdate, 10, 20);

    expect(result.startDate.getFullYear()).toBe(2010);
    expect(result.startDate.getMonth()).toBe(5); // June (0-indexed)
    expect(result.startDate.getDate()).toBe(15);

    // End age 20 means the day before turning 21
    expect(result.endDate.getFullYear()).toBe(2021);
    expect(result.endDate.getMonth()).toBe(5);
    expect(result.endDate.getDate()).toBe(14);
  });

  it('should handle same start and end age', () => {
    const birthdate = new Date('2000-01-01');
    const result = resolveAgesToDates(birthdate, 15, 15);

    expect(result.startDate.getFullYear()).toBe(2015);
    // End is the day before turning 16
    expect(result.endDate.getFullYear()).toBe(2015);
    expect(result.endDate.getMonth()).toBe(11); // December
    expect(result.endDate.getDate()).toBe(31);
  });

  it('should throw for negative ages', () => {
    const birthdate = new Date('2000-01-01');
    expect(() => resolveAgesToDates(birthdate, -1, 10)).toThrow('Ages must be non-negative');
  });

  it('should throw when start age exceeds end age', () => {
    const birthdate = new Date('2000-01-01');
    expect(() => resolveAgesToDates(birthdate, 20, 10)).toThrow(
      'Start age must be less than or equal to end age',
    );
  });
});

describe('mergeOverlappingPeriods', () => {
  it('should return empty array for empty input', () => {
    expect(mergeOverlappingPeriods([])).toEqual([]);
  });

  it('should return single period unchanged', () => {
    const periods = [{ startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') }];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    expect(result[0].endDate).toEqual(new Date('2024-01-31'));
  });

  it('should not merge non-overlapping periods', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-15') },
      { startDate: new Date('2024-02-01'), endDate: new Date('2024-02-28') },
    ];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(2);
  });

  it('should merge overlapping periods', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-20') },
      { startDate: new Date('2024-01-15'), endDate: new Date('2024-02-10') },
    ];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    expect(result[0].endDate).toEqual(new Date('2024-02-10'));
  });

  it('should merge adjacent periods that share an endpoint', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-15') },
      { startDate: new Date('2024-01-15'), endDate: new Date('2024-01-31') },
    ];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    expect(result[0].endDate).toEqual(new Date('2024-01-31'));
  });

  it('should merge when one period fully contains another', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') },
      { startDate: new Date('2024-02-01'), endDate: new Date('2024-02-28') },
    ];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    expect(result[0].endDate).toEqual(new Date('2024-03-31'));
  });

  it('should handle multiple overlapping periods in chain', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-20') },
      { startDate: new Date('2024-01-15'), endDate: new Date('2024-02-10') },
      { startDate: new Date('2024-02-05'), endDate: new Date('2024-03-01') },
    ];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    expect(result[0].endDate).toEqual(new Date('2024-03-01'));
  });

  it('should handle unsorted input', () => {
    const periods = [
      { startDate: new Date('2024-03-01'), endDate: new Date('2024-03-31') },
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      { startDate: new Date('2024-01-20'), endDate: new Date('2024-02-15') },
    ];
    const result = mergeOverlappingPeriods(periods);
    expect(result).toHaveLength(2);
    // First merged period: Jan 1 - Feb 15
    expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    expect(result[0].endDate).toEqual(new Date('2024-02-15'));
    // Second period: Mar 1 - Mar 31
    expect(result[1].startDate).toEqual(new Date('2024-03-01'));
    expect(result[1].endDate).toEqual(new Date('2024-03-31'));
  });
});

describe('calculateTotalPrayers', () => {
  it('should return zeros for empty periods', () => {
    const result = calculateTotalPrayers([]);
    expect(result.totalDays).toBe(0);
    expect(result.totalPrayers).toBe(0);
    expect(result.perType.fajr).toBe(0);
    expect(result.mergedPeriods).toEqual([]);
  });

  it('should calculate correctly for single period', () => {
    const periods = [{ startDate: new Date('2024-01-01'), endDate: new Date('2024-01-10') }];
    const result = calculateTotalPrayers(periods);
    expect(result.totalDays).toBe(10);
    expect(result.totalPrayers).toBe(50);
    expect(result.perType.fajr).toBe(10);
    expect(result.perType.dhuhr).toBe(10);
    expect(result.perType.asr).toBe(10);
    expect(result.perType.maghrib).toBe(10);
    expect(result.perType.isha).toBe(10);
    expect(result.mergedPeriods).toHaveLength(1);
    expect(result.mergedPeriods[0].days).toBe(10);
  });

  it('should deduplicate overlapping periods', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-20') },
      { startDate: new Date('2024-01-10'), endDate: new Date('2024-01-30') },
    ];
    const result = calculateTotalPrayers(periods);
    // Merged: Jan 1 - Jan 30 = 30 days, not 20 + 21 = 41
    expect(result.totalDays).toBe(30);
    expect(result.totalPrayers).toBe(150);
  });

  it('should sum non-overlapping periods', () => {
    const periods = [
      { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-10') },
      { startDate: new Date('2024-03-01'), endDate: new Date('2024-03-10') },
    ];
    const result = calculateTotalPrayers(periods);
    expect(result.totalDays).toBe(20); // 10 + 10
    expect(result.totalPrayers).toBe(100);
    expect(result.mergedPeriods).toHaveLength(2);
  });

  it('should distribute prayers evenly across types', () => {
    const periods = [{ startDate: new Date('2024-01-01'), endDate: new Date('2024-01-01') }];
    const result = calculateTotalPrayers(periods);
    expect(result.perType.fajr).toBe(1);
    expect(result.perType.dhuhr).toBe(1);
    expect(result.perType.asr).toBe(1);
    expect(result.perType.maghrib).toBe(1);
    expect(result.perType.isha).toBe(1);
    expect(result.totalPrayers).toBe(5);
  });
});

describe('DateRange Value Object', () => {
  it('should throw when start date is after end date', () => {
    expect(() => new DateRange(new Date('2024-02-01'), new Date('2024-01-01'))).toThrow(
      'Start date must be before or equal to end date',
    );
  });

  it('should detect overlapping ranges', () => {
    const a = DateRange.fromDates(new Date('2024-01-01'), new Date('2024-01-20'));
    const b = DateRange.fromDates(new Date('2024-01-15'), new Date('2024-02-10'));
    expect(a.overlaps(b)).toBe(true);
    expect(b.overlaps(a)).toBe(true);
  });

  it('should detect non-overlapping ranges', () => {
    const a = DateRange.fromDates(new Date('2024-01-01'), new Date('2024-01-10'));
    const b = DateRange.fromDates(new Date('2024-02-01'), new Date('2024-02-10'));
    expect(a.overlaps(b)).toBe(false);
  });

  it('should merge overlapping ranges', () => {
    const a = DateRange.fromDates(new Date('2024-01-01'), new Date('2024-01-20'));
    const b = DateRange.fromDates(new Date('2024-01-15'), new Date('2024-02-10'));
    const merged = a.merge(b);
    expect(merged.startDate).toEqual(new Date('2024-01-01'));
    expect(merged.endDate).toEqual(new Date('2024-02-10'));
  });

  it('should throw when merging non-overlapping ranges', () => {
    const a = DateRange.fromDates(new Date('2024-01-01'), new Date('2024-01-10'));
    const b = DateRange.fromDates(new Date('2024-02-01'), new Date('2024-02-10'));
    expect(() => a.merge(b)).toThrow('Cannot merge non-overlapping date ranges');
  });

  it('should create range from ages', () => {
    const birthdate = new Date('2000-03-15');
    const range = DateRange.fromAges(birthdate, 10, 12);
    expect(range.startDate.getFullYear()).toBe(2010);
    expect(range.endDate.getFullYear()).toBe(2013);
    expect(range.endDate.getMonth()).toBe(2); // March
    expect(range.endDate.getDate()).toBe(14); // Day before 13th birthday
  });
});
