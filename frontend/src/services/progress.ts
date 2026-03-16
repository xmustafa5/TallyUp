import api from './api';
import type { ApiResponse } from '@/types/api';

export interface DashboardData {
  totalRemaining: number;
  totalCompleted: number;
  completionPercentage: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
  };
  todayStatus: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    completedCount: number;
    isFinalized: boolean;
  };
  recentActivity: number;
  milestone: string | null;
}

export interface CalendarDay {
  date: string;
  prayedCount: number;
  makeupCount: number;
  isFinalized: boolean;
  status: 'complete' | 'partial' | 'missed' | 'future' | 'no-data';
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<ApiResponse<DashboardData>>('/progress');
  return data.data;
}

export async function getCalendarMonth(
  year: number,
  month: number,
): Promise<CalendarDay[]> {
  const { data } = await api.get<ApiResponse<CalendarDay[]>>(
    `/progress/calendar/${year}/${month}`,
  );
  return data.data;
}

export async function getStreaks(): Promise<StreakData> {
  const { data } = await api.get<ApiResponse<StreakData>>('/progress/streaks');
  return data.data;
}
