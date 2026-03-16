'use client';

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

const GAP_PERIODS_KEY = ['gap-periods'] as const;
const CALCULATION_KEY = ['gap-periods', 'calculation'] as const;
const BALANCE_KEY = ['gap-periods', 'balance'] as const;

export function useGapPeriods() {
  return useQuery({
    queryKey: GAP_PERIODS_KEY,
    queryFn: getGapPeriods,
  });
}

export function useCreateGapPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGapPeriodPayload) => createGapPeriod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAP_PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
      queryClient.invalidateQueries({ queryKey: CALCULATION_KEY });
    },
  });
}

export function useUpdateGapPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGapPeriodPayload }) =>
      updateGapPeriod(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAP_PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
      queryClient.invalidateQueries({ queryKey: CALCULATION_KEY });
    },
  });
}

export function useDeleteGapPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGapPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAP_PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCE_KEY });
      queryClient.invalidateQueries({ queryKey: CALCULATION_KEY });
    },
  });
}

export function useCalculation() {
  return useQuery({
    queryKey: CALCULATION_KEY,
    queryFn: calculatePrayers,
  });
}

export function usePrayerBalance() {
  return useQuery({
    queryKey: BALANCE_KEY,
    queryFn: getPrayerBalance,
  });
}
