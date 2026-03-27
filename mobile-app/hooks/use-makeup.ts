import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMakeupHistory,
  getMakeupStats,
  logMakeupPrayer,
  logMakeupForDay,
  undoMakeupPrayer,
} from '@/services/makeup';
import { queryKeys } from '@/constants/query-keys';

export function useMakeupHistory(prayerType?: string) {
  return useQuery({
    queryKey: [...queryKeys.makeup.history, prayerType],
    queryFn: () => getMakeupHistory(prayerType ? { prayerType } : undefined),
  });
}

export function useLogMakeup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prayerType: string) => logMakeupPrayer(prayerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.history });
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.dashboard });
      queryClient.invalidateQueries({ queryKey: ['progress', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.todayProgress });
    },
  });
}

export function useLogMakeupForDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, prayerType }: { date: string; prayerType: string }) =>
      logMakeupForDay(date, prayerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.history });
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.dashboard });
      queryClient.invalidateQueries({ queryKey: ['progress', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.todayProgress });
    },
  });
}

export function useUndoMakeup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => undoMakeupPrayer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.history });
      queryClient.invalidateQueries({ queryKey: queryKeys.makeup.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.progress.dashboard });
      queryClient.invalidateQueries({ queryKey: ['progress', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.todayProgress });
    },
  });
}

export function useMakeupStats() {
  return useQuery({
    queryKey: queryKeys.makeup.stats,
    queryFn: getMakeupStats,
  });
}
