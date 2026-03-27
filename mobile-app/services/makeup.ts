import api from './api';
import type { ApiResponse } from '@/types/api';

export interface MakeupLogEntry {
  id: string;
  prayerType: string;
  source: string;
  completedAt: string;
  createdAt: string;
}

export interface MakeupStatsPerType {
  completed: number;
  remaining: number;
}

export interface MakeupStats {
  perType: {
    fajr: MakeupStatsPerType;
    dhuhr: MakeupStatsPerType;
    asr: MakeupStatsPerType;
    maghrib: MakeupStatsPerType;
    isha: MakeupStatsPerType;
  };
  totalCompleted: number;
  totalRemaining: number;
}

export interface MakeupHistoryParams {
  prayerType?: string;
  limit?: number;
  offset?: number;
}

export async function logMakeupPrayer(prayerType: string): Promise<MakeupLogEntry> {
  const { data } = await api.post<ApiResponse<MakeupLogEntry>>('/makeup', { prayerType });
  return data.data;
}

export async function logMakeupForDay(date: string, prayerType: string): Promise<MakeupLogEntry> {
  const { data } = await api.post<ApiResponse<MakeupLogEntry>>(`/makeup/day/${date}`, { prayerType });
  return data.data;
}

export async function undoMakeupPrayer(id: string): Promise<void> {
  await api.delete(`/makeup/${id}`);
}

export async function getMakeupHistory(
  params?: MakeupHistoryParams,
): Promise<MakeupLogEntry[]> {
  const { data } = await api.get<ApiResponse<MakeupLogEntry[]>>('/makeup/history', {
    params,
  });
  return data.data;
}

export async function getMakeupStats(): Promise<MakeupStats> {
  const { data } = await api.get<ApiResponse<MakeupStats>>('/makeup/stats');
  return data.data;
}
