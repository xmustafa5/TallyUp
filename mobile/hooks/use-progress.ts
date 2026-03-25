import { useQuery } from '@tanstack/react-query';
import { getDashboard, getCalendarMonth, getCalendarDayDetail, getStreaks } from '@/services/progress';
import { queryKeys } from '@/constants/query-keys';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.progress.dashboard,
    queryFn: getDashboard,
    staleTime: 15_000,
  });
}

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.progress.calendar(year, month),
    queryFn: () => getCalendarMonth(year, month),
    staleTime: 60_000,
  });
}

export function useCalendarDayDetail(date: string | null) {
  return useQuery({
    queryKey: queryKeys.progress.calendarDay(date!),
    queryFn: () => getCalendarDayDetail(date!),
    enabled: !!date,
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: queryKeys.progress.streaks,
    queryFn: getStreaks,
  });
}
