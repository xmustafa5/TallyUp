import type { DailyTracker } from '../entities/daily-tracker.entity';

export interface UpsertDailyTrackerData {
  fajr?: boolean;
  dhuhr?: boolean;
  asr?: boolean;
  maghrib?: boolean;
  isha?: boolean;
}

export interface DailyTrackerRepository {
  findByUserAndDate(userId: string, date: Date): Promise<DailyTracker | null>;
  findByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<DailyTracker[]>;
  upsert(userId: string, date: Date, data: UpsertDailyTrackerData): Promise<DailyTracker>;
  findUnfinalizedBefore(date: Date): Promise<DailyTracker[]>;
  findUnfinalizedBeforeForUser(userId: string, date: Date): Promise<DailyTracker[]>;
  finalize(id: string): Promise<DailyTracker>;
}
