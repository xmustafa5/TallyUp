'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getToday,
  getDate,
  markPrayers,
  finalizeDay,
  getWeek,
  getStreak,
} from '@/services/daily-tracker';
import type { MarkPrayersPayload } from '@/services/daily-tracker';

const TODAY_KEY = ['daily-tracker', 'today'] as const;
const WEEK_KEY = ['daily-tracker', 'week'] as const;
const STREAK_KEY = ['daily-tracker', 'streak'] as const;
const MAKEUP_STATS_KEY = ['makeup', 'stats'] as const;
const MAKEUP_HISTORY_KEY = ['makeup', 'history'] as const;
const BALANCE_KEY = ['gap-periods', 'balance'] as const;

export function useTodayTracker() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: getToday,
  });
}

export function useDateTracker(date: string) {
  return useQuery({
    queryKey: ['daily-tracker', 'date', date],
    queryFn: () => getDate(date),
    enabled: !!date,
  });
}

export function useMarkPrayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, prayers }: { date: string; prayers: MarkPrayersPayload }) =>
      markPrayers(date, prayers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEK_KEY });
    },
  });
}

export function useFinalizeDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (date: string) => finalizeDay(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
      queryClient.invalidateQueries({ queryKey: WEEK_KEY });
      queryClient.invalidateQueries({ queryKey: STREAK_KEY });
      queryClient.invalidateQueries({ queryKey: MAKEUP_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: MAKEUP_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
    },
  });
}

export function useWeekTrackers(date?: string) {
  return useQuery({
    queryKey: [...WEEK_KEY, date],
    queryFn: () => getWeek(date),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: STREAK_KEY,
    queryFn: getStreak,
  });
}
