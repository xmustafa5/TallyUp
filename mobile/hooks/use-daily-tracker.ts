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
import { queryKeys } from '@/constants/query-keys';

export function useTodayTracker() {
  return useQuery({
    queryKey: queryKeys.dailyTracker.today,
    queryFn: getToday,
  });
}

export function useDateTracker(date: string) {
  return useQuery({
    queryKey: queryKeys.dailyTracker.date(date),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTracker.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTracker.week });
    },
  });
}

export function useFinalizeDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (date: string) => finalizeDay(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTracker.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTracker.week });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyTracker.streak });
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.history });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
    },
  });
}

export function useWeekTrackers(date?: string) {
  return useQuery({
    queryKey: [...queryKeys.dailyTracker.week, date],
    queryFn: () => getWeek(date),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.dailyTracker.streak,
    queryFn: getStreak,
  });
}
