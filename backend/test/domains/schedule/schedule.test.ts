import { describe, it, expect } from 'vitest';
import { Schedule } from '../../../src/app/domains/schedule/domain/entities/schedule.entity';
import type { ScheduleProps } from '../../../src/app/domains/schedule/domain/entities/schedule.entity';

function makeProps(overrides?: Partial<ScheduleProps>): ScheduleProps {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '660e8400-e29b-41d4-a716-446655440000',
    dailyGoal: 5,
    weeklyGoal: 35,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T12:00:00.000Z'),
    ...overrides,
  };
}

describe('Schedule Entity', () => {
  describe('fromPrisma', () => {
    it('should create a Schedule instance from Prisma data', () => {
      const props = makeProps();
      const schedule = Schedule.fromPrisma(props);

      expect(schedule).toBeInstanceOf(Schedule);
      expect(schedule.id).toBe(props.id);
      expect(schedule.userId).toBe(props.userId);
      expect(schedule.dailyGoal).toBe(5);
      expect(schedule.weeklyGoal).toBe(35);
      expect(schedule.isActive).toBe(true);
      expect(schedule.createdAt).toEqual(props.createdAt);
      expect(schedule.updatedAt).toEqual(props.updatedAt);
    });

    it('should preserve custom goal values', () => {
      const schedule = Schedule.fromPrisma(makeProps({ dailyGoal: 10, weeklyGoal: 70 }));

      expect(schedule.dailyGoal).toBe(10);
      expect(schedule.weeklyGoal).toBe(70);
    });

    it('should preserve inactive status', () => {
      const schedule = Schedule.fromPrisma(makeProps({ isActive: false }));

      expect(schedule.isActive).toBe(false);
    });
  });

  describe('toResponse', () => {
    it('should return a properly formatted response object', () => {
      const props = makeProps();
      const schedule = Schedule.fromPrisma(props);
      const response = schedule.toResponse();

      expect(response).toEqual({
        id: props.id,
        dailyGoal: 5,
        weeklyGoal: 35,
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T12:00:00.000Z',
      });
    });

    it('should convert dates to ISO strings', () => {
      const schedule = Schedule.fromPrisma(makeProps({
        createdAt: new Date('2024-06-15T10:30:00.000Z'),
        updatedAt: new Date('2024-06-16T14:45:00.000Z'),
      }));
      const response = schedule.toResponse();

      expect(response.createdAt).toBe('2024-06-15T10:30:00.000Z');
      expect(response.updatedAt).toBe('2024-06-16T14:45:00.000Z');
    });

    it('should not include userId in response', () => {
      const schedule = Schedule.fromPrisma(makeProps());
      const response = schedule.toResponse();

      expect(response).not.toHaveProperty('userId');
    });

    it('should return correct values for non-default goals', () => {
      const schedule = Schedule.fromPrisma(makeProps({ dailyGoal: 20, weeklyGoal: 100 }));
      const response = schedule.toResponse();

      expect(response.dailyGoal).toBe(20);
      expect(response.weeklyGoal).toBe(100);
    });
  });
});
