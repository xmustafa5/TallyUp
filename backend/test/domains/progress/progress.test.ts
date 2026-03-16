import { describe, it, expect } from 'vitest';
import {
  calculateDashboard,
  calculateCalendarMonth,
  getMilestone,
} from '../../../src/app/domains/progress/domain/services/progress.service';

describe('calculateDashboard', () => {
  it('should return zeros when no data is provided', () => {
    const result = calculateDashboard(null, null, null, 0);

    expect(result.totalRemaining).toBe(0);
    expect(result.totalCompleted).toBe(0);
    expect(result.completionPercentage).toBe(0);
    expect(result.streak.currentStreak).toBe(0);
    expect(result.streak.longestStreak).toBe(0);
    expect(result.streak.lastActiveDate).toBeNull();
    expect(result.todayStatus.fajr).toBe(false);
    expect(result.todayStatus.dhuhr).toBe(false);
    expect(result.todayStatus.asr).toBe(false);
    expect(result.todayStatus.maghrib).toBe(false);
    expect(result.todayStatus.isha).toBe(false);
    expect(result.todayStatus.completedCount).toBe(0);
    expect(result.todayStatus.isFinalized).toBe(false);
    expect(result.recentActivity).toBe(0);
  });

  it('should calculate correct completion percentage', () => {
    const balance = {
      fajr: 30,
      dhuhr: 30,
      asr: 30,
      maghrib: 30,
      isha: 30,
      totalRemaining: 150,
      totalCompleted: 50,
    };

    const result = calculateDashboard(balance, null, null, 0);

    expect(result.totalRemaining).toBe(150);
    expect(result.totalCompleted).toBe(50);
    expect(result.completionPercentage).toBe(25);
  });

  it('should include correct today status', () => {
    const todayTracker = {
      fajr: true,
      dhuhr: true,
      asr: false,
      maghrib: true,
      isha: false,
      isFinalized: false,
    };

    const result = calculateDashboard(null, null, todayTracker, 0);

    expect(result.todayStatus.fajr).toBe(true);
    expect(result.todayStatus.dhuhr).toBe(true);
    expect(result.todayStatus.asr).toBe(false);
    expect(result.todayStatus.maghrib).toBe(true);
    expect(result.todayStatus.isha).toBe(false);
    expect(result.todayStatus.completedCount).toBe(3);
    expect(result.todayStatus.isFinalized).toBe(false);
  });

  it('should handle 100% completion', () => {
    const balance = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
      totalRemaining: 0,
      totalCompleted: 500,
    };

    const result = calculateDashboard(balance, null, null, 0);

    expect(result.totalRemaining).toBe(0);
    expect(result.totalCompleted).toBe(500);
    expect(result.completionPercentage).toBe(100);
  });

  it('should include streak data', () => {
    const streak = {
      currentStreak: 7,
      longestStreak: 14,
      lastActiveDate: new Date('2024-06-15T00:00:00.000Z'),
    };

    const result = calculateDashboard(null, streak, null, 0);

    expect(result.streak.currentStreak).toBe(7);
    expect(result.streak.longestStreak).toBe(14);
    expect(result.streak.lastActiveDate).toBe('2024-06-15');
  });

  it('should include recent activity count', () => {
    const result = calculateDashboard(null, null, null, 12);

    expect(result.recentActivity).toBe(12);
  });

  it('should round completion percentage to 1 decimal', () => {
    const balance = {
      fajr: 10,
      dhuhr: 10,
      asr: 10,
      maghrib: 10,
      isha: 10,
      totalRemaining: 50,
      totalCompleted: 7,
    };

    const result = calculateDashboard(balance, null, null, 0);

    // 7 / 57 = 12.2807... -> rounded to 12.3
    expect(result.completionPercentage).toBe(12.3);
  });
});

describe('calculateCalendarMonth', () => {
  it('should return correct number of days for a month', () => {
    // February 2024 (leap year) has 29 days
    const result = calculateCalendarMonth([], [], 2024, 2);
    expect(result).toHaveLength(29);

    // January has 31 days
    const result2 = calculateCalendarMonth([], [], 2024, 1);
    expect(result2).toHaveLength(31);

    // April has 30 days
    const result3 = calculateCalendarMonth([], [], 2024, 4);
    expect(result3).toHaveLength(30);
  });

  it('should mark complete when all 5 prayers are prayed', () => {
    const trackers = [
      {
        date: new Date('2024-01-15T00:00:00.000Z'),
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
        isFinalized: true,
      },
    ];

    const result = calculateCalendarMonth(trackers, [], 2024, 1);
    const day15 = result.find((d) => d.date === '2024-01-15');

    expect(day15).toBeDefined();
    expect(day15!.prayedCount).toBe(5);
    expect(day15!.status).toBe('complete');
    expect(day15!.isFinalized).toBe(true);
  });

  it('should mark partial when 1-4 prayers are prayed', () => {
    const trackers = [
      {
        date: new Date('2024-01-10T00:00:00.000Z'),
        fajr: true,
        dhuhr: false,
        asr: true,
        maghrib: false,
        isha: true,
        isFinalized: false,
      },
    ];

    const result = calculateCalendarMonth(trackers, [], 2024, 1);
    const day10 = result.find((d) => d.date === '2024-01-10');

    expect(day10).toBeDefined();
    expect(day10!.prayedCount).toBe(3);
    expect(day10!.status).toBe('partial');
  });

  it('should mark missed when 0 prayers are prayed on a past date with tracker', () => {
    const trackers = [
      {
        date: new Date('2024-01-05T00:00:00.000Z'),
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
        isFinalized: true,
      },
    ];

    const result = calculateCalendarMonth(trackers, [], 2024, 1);
    const day5 = result.find((d) => d.date === '2024-01-05');

    expect(day5).toBeDefined();
    expect(day5!.prayedCount).toBe(0);
    expect(day5!.status).toBe('missed');
  });

  it('should mark future dates correctly', () => {
    // Use a date far in the future to ensure test stability
    const result = calculateCalendarMonth([], [], 2099, 12);
    const day25 = result.find((d) => d.date === '2099-12-25');

    expect(day25).toBeDefined();
    expect(day25!.status).toBe('future');
    expect(day25!.prayedCount).toBe(0);
    expect(day25!.makeupCount).toBe(0);
  });

  it('should handle empty data with no-data status for past dates', () => {
    // Use a past month with no data
    const result = calculateCalendarMonth([], [], 2020, 6);

    // All days should be no-data since they are in the past and have no tracker
    for (const day of result) {
      expect(day.status).toBe('no-data');
      expect(day.prayedCount).toBe(0);
      expect(day.makeupCount).toBe(0);
    }
  });

  it('should count makeup logs per day correctly', () => {
    const makeupLogs = [
      { completedAt: new Date('2024-01-15T10:00:00.000Z') },
      { completedAt: new Date('2024-01-15T14:00:00.000Z') },
      { completedAt: new Date('2024-01-15T18:00:00.000Z') },
      { completedAt: new Date('2024-01-20T10:00:00.000Z') },
    ];

    const result = calculateCalendarMonth([], makeupLogs, 2024, 1);
    const day15 = result.find((d) => d.date === '2024-01-15');
    const day20 = result.find((d) => d.date === '2024-01-20');

    expect(day15!.makeupCount).toBe(3);
    expect(day20!.makeupCount).toBe(1);
  });

  it('should format dates with leading zeros', () => {
    const result = calculateCalendarMonth([], [], 2024, 1);
    expect(result[0].date).toBe('2024-01-01');
    expect(result[8].date).toBe('2024-01-09');
  });
});

describe('getMilestone', () => {
  it('should return null for non-milestone percentages', () => {
    expect(getMilestone(0)).toBeNull();
    expect(getMilestone(5)).toBeNull();
    expect(getMilestone(15)).toBeNull();
    expect(getMilestone(30)).toBeNull();
    expect(getMilestone(45)).toBeNull();
    expect(getMilestone(60)).toBeNull();
    expect(getMilestone(80)).toBeNull();
    expect(getMilestone(95)).toBeNull();
  });

  it('should return message for 10% milestone', () => {
    const result = getMilestone(10);
    expect(result).toBe('You have completed 10% of your missed prayers!');
  });

  it('should return message for 25% milestone', () => {
    const result = getMilestone(25);
    expect(result).toBe('You have completed 25% of your missed prayers!');
  });

  it('should return message for 50% milestone', () => {
    const result = getMilestone(50);
    expect(result).toBe('You have completed 50% of your missed prayers!');
  });

  it('should return message for 75% milestone', () => {
    const result = getMilestone(75);
    expect(result).toBe('You have completed 75% of your missed prayers!');
  });

  it('should return message for 90% milestone', () => {
    const result = getMilestone(90);
    expect(result).toBe('You have completed 90% of your missed prayers!');
  });

  it('should return message for 100% milestone', () => {
    const result = getMilestone(100);
    expect(result).toBe('You have completed 100% of your missed prayers!');
  });

  it('should return message for fractional milestone values within range', () => {
    const result = getMilestone(10.5);
    expect(result).toBe('You have completed 10% of your missed prayers!');
  });

  it('should return null for values just below a milestone', () => {
    expect(getMilestone(9.9)).toBeNull();
    expect(getMilestone(24.5)).toBeNull();
    expect(getMilestone(49.9)).toBeNull();
  });
});
