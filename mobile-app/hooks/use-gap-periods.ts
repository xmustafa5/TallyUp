import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGapPeriods,
  createGapPeriod,
  updateGapPeriod,
  deleteGapPeriod,
  calculatePrayers,
  getPrayerBalance,
} from '@/services/gap-periods';
import type { CreateGapPeriodPayload, UpdateGapPeriodPayload } from '@/services/gap-periods';
import { queryKeys } from '@/constants/query-keys';

export function useGapPeriods() {
  return useQuery({
    queryKey: queryKeys.gapPeriods.all,
    queryFn: getGapPeriods,
  });
}

export function useCreateGapPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGapPeriodPayload) => createGapPeriod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.calculation });
    },
  });
}

export function useUpdateGapPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGapPeriodPayload }) =>
      updateGapPeriod(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.calculation });
    },
  });
}

export function useDeleteGapPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGapPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.gapPeriods.calculation });
    },
  });
}

export function useCalculation() {
  return useQuery({
    queryKey: queryKeys.gapPeriods.calculation,
    queryFn: calculatePrayers,
  });
}

export function usePrayerBalance() {
  return useQuery({
    queryKey: queryKeys.gapPeriods.balance,
    queryFn: getPrayerBalance,
    staleTime: 30_000,
  });
}
