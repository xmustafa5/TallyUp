'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchedule,
  updateSchedule,
  getTodayProgress,
} from '@/services/schedule';
import type { UpdateSchedulePayload } from '@/services/schedule';

const SCHEDULE_KEY = ['schedule'] as const;
const TODAY_PROGRESS_KEY = ['schedule', 'today-progress'] as const;

export function useSchedule() {
  return useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: getSchedule,
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSchedulePayload) => updateSchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_PROGRESS_KEY });
    },
  });
}

export function useTodayProgress() {
  return useQuery({
    queryKey: TODAY_PROGRESS_KEY,
    queryFn: getTodayProgress,
    staleTime: 30_000,
  });
}
