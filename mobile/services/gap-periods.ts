import api from './api';
import type { ApiResponse } from '@/types/api';

export type InputMethod = 'DATE_RANGE' | 'AGE_RANGE';

export interface GapPeriod {
  id: string;
  startDate: string;
  endDate: string;
  inputMethod: InputMethod;
  originalStartAge: number | null;
  originalEndAge: number | null;
  totalDays: number;
  totalPrayers: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerBalance {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  totalRemaining: number;
  totalCompleted: number;
}

export interface MergedPeriod {
  startDate: string;
  endDate: string;
  days: number;
}

export interface CalculationResult {
  totalDays: number;
  totalPrayers: number;
  perType: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
  mergedPeriods: MergedPeriod[];
  balance: PrayerBalance;
}

export interface CreateGapPeriodPayload {
  inputMethod: InputMethod;
  startDate?: string;
  endDate?: string;
  startAge?: number;
  endAge?: number;
}

export interface UpdateGapPeriodPayload {
  startDate?: string;
  endDate?: string;
}

export async function getGapPeriods(): Promise<GapPeriod[]> {
  const { data } = await api.get<ApiResponse<GapPeriod[]>>('/gap-periods');
  return data.data;
}

export async function createGapPeriod(payload: CreateGapPeriodPayload): Promise<GapPeriod> {
  const { data } = await api.post<ApiResponse<GapPeriod>>('/gap-periods', payload);
  return data.data;
}

export async function updateGapPeriod(
  id: string,
  payload: UpdateGapPeriodPayload,
): Promise<GapPeriod> {
  const { data } = await api.put<ApiResponse<GapPeriod>>(`/gap-periods/${id}`, payload);
  return data.data;
}

export async function deleteGapPeriod(id: string): Promise<void> {
  await api.delete(`/gap-periods/${id}`);
}

export async function calculatePrayers(): Promise<CalculationResult> {
  const { data } = await api.get<ApiResponse<CalculationResult>>('/gap-periods/calculate');
  return data.data;
}

export async function getPrayerBalance(): Promise<PrayerBalance> {
  const { data } = await api.get<ApiResponse<PrayerBalance>>('/gap-periods/balance');
  return data.data;
}
