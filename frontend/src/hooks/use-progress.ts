'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboard, getCalendarMonth, getStreaks } from '@/services/progress';

const DASHBOARD_KEY = ['progress', 'dashboard'] as const;
const STREAKS_KEY = ['progress', 'streaks'] as const;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: getDashboard,
  });
}

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['progress', 'calendar', year, month] as const,
    queryFn: () => getCalendarMonth(year, month),
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: STREAKS_KEY,
    queryFn: getStreaks,
  });
}
