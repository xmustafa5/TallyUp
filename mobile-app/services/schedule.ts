import api from './api';
import type { ApiResponse } from '@/types/api';

export interface ScheduleData {
  id: string;
  dailyGoal: number;
  weeklyGoal: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodayProgress {
  dailyGoal: number;
  dailyCompleted: number;
  weeklyGoal: number;
  weeklyCompleted: number;
  dailyPercentage: number;
  weeklyPercentage: number;
}

export interface UpdateSchedulePayload {
  dailyGoal?: number;
  weeklyGoal?: number;
}

export async function getSchedule(): Promise<ScheduleData> {
  const { data } = await api.get<ApiResponse<ScheduleData>>('/schedule');
  return data.data;
}

export async function updateSchedule(payload: UpdateSchedulePayload): Promise<ScheduleData> {
  const { data } = await api.put<ApiResponse<ScheduleData>>('/schedule', payload);
  return data.data;
}

export async function getTodayProgress(): Promise<TodayProgress> {
  const { data } = await api.get<ApiResponse<TodayProgress>>('/schedule/today');
  return data.data;
}
