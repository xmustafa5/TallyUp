'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMakeupHistory,
  getMakeupStats,
  logMakeupPrayer,
  undoMakeupPrayer,
} from '@/services/makeup';

const MAKEUP_HISTORY_KEY = ['makeup', 'history'] as const;
const MAKEUP_STATS_KEY = ['makeup', 'stats'] as const;
const BALANCE_KEY = ['gap-periods', 'balance'] as const;
const DASHBOARD_KEY = ['progress', 'dashboard'] as const;
const CALENDAR_KEY = ['progress', 'calendar'] as const;
const SCHEDULE_TODAY_KEY = ['schedule', 'today-progress'] as const;

export function useMakeupHistory(prayerType?: string) {
  return useQuery({
    queryKey: [...MAKEUP_HISTORY_KEY, prayerType],
    queryFn: () => getMakeupHistory(prayerType ? { prayerType } : undefined),
  });
}

export function useLogMakeup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prayerType: string) => logMakeupPrayer(prayerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAKEUP_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: MAKEUP_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_TODAY_KEY });
    },
  });
}

export function useUndoMakeup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => undoMakeupPrayer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAKEUP_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: MAKEUP_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_TODAY_KEY });
    },
  });
}

export function useMakeupStats() {
  return useQuery({
    queryKey: MAKEUP_STATS_KEY,
    queryFn: getMakeupStats,
  });
}
