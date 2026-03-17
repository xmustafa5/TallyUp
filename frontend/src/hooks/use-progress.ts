'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboard, getCalendarMonth, getCalendarDayDetail, getStreaks } from '@/services/progress';

const DASHBOARD_KEY = ['progress', 'dashboard'] as const;
const STREAKS_KEY = ['progress', 'streaks'] as const;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: getDashboard,
    staleTime: 15_000,
  });
}

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['progress', 'calendar', year, month] as const,
    queryFn: () => getCalendarMonth(year, month),
    staleTime: 60_000,
  });
}

export function useCalendarDayDetail(date: string | null) {
  return useQuery({
    queryKey: ['progress', 'calendar', 'day', date] as const,
    queryFn: () => getCalendarDayDetail(date!),
    enabled: !!date,
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: STREAKS_KEY,
    queryFn: getStreaks,
  });
}
