import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchedule,
  updateSchedule,
  getTodayProgress,
} from '@/services/schedule';
import type { UpdateSchedulePayload } from '@/services/schedule';
import { queryKeys } from '@/constants/query-keys';

export function useSchedule() {
  return useQuery({
    queryKey: queryKeys.schedule.all,
    queryFn: getSchedule,
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSchedulePayload) => updateSchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule.todayProgress });
    },
  });
}

export function useTodayProgress() {
  return useQuery({
    queryKey: queryKeys.schedule.todayProgress,
    queryFn: getTodayProgress,
    staleTime: 30_000,
  });
}
