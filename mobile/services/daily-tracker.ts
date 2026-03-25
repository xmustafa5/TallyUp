import api from './api';
import type { ApiResponse } from '@/types/api';

export interface DailyTrackerData {
  id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface MarkPrayersPayload {
  fajr?: boolean;
  dhuhr?: boolean;
  asr?: boolean;
  maghrib?: boolean;
  isha?: boolean;
}

export async function getToday(): Promise<DailyTrackerData> {
  const { data } = await api.get<ApiResponse<DailyTrackerData>>('/daily-tracker/today');
  return data.data;
}

export async function getDate(date: string): Promise<DailyTrackerData> {
  const { data } = await api.get<ApiResponse<DailyTrackerData>>(`/daily-tracker/${date}`);
  return data.data;
}

export async function markPrayers(
  date: string,
  prayers: MarkPrayersPayload,
): Promise<DailyTrackerData> {
  const { data } = await api.patch<ApiResponse<DailyTrackerData>>(
    `/daily-tracker/${date}`,
    prayers,
  );
  return data.data;
}

export async function finalizeDay(date: string): Promise<DailyTrackerData> {
  const { data } = await api.post<ApiResponse<DailyTrackerData>>(
    `/daily-tracker/${date}/finalize`,
  );
  return data.data;
}

export async function getWeek(date?: string): Promise<DailyTrackerData[]> {
  const { data } = await api.get<ApiResponse<DailyTrackerData[]>>('/daily-tracker/week', {
    params: date ? { date } : undefined,
  });
  return data.data;
}

export async function getStreak(): Promise<StreakData> {
  const { data } = await api.get<ApiResponse<StreakData>>('/daily-tracker/streak');
  return data.data;
}
