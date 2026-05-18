import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cyclesService } from '@/services/cycles';
import { queryKeys } from '@/constants/query-keys';

/** Live leaderboard; refetches every 15s and on screen focus. */
export function useCurrentCycle(roomId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.rooms.currentCycle(roomId),
    queryFn: () => cyclesService.current(roomId),
    enabled: !!roomId,
    refetchInterval: 15_000,
    retry: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (roomId) {
        qc.invalidateQueries({
          queryKey: queryKeys.rooms.currentCycle(roomId),
        });
      }
    }, [qc, roomId]),
  );

  return query;
}

export function useCycleHistory(roomId: string) {
  return useQuery({
    queryKey: queryKeys.rooms.history(roomId),
    queryFn: () => cyclesService.history(roomId),
    enabled: !!roomId,
  });
}

export function useCycle(cycleId: string) {
  return useQuery({
    queryKey: queryKeys.cycles.detail(cycleId),
    queryFn: () => cyclesService.get(cycleId),
    enabled: !!cycleId,
  });
}

export function useAdvanceCycle(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: string) => cyclesService.advance(cycleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) });
      qc.invalidateQueries({
        queryKey: queryKeys.rooms.currentCycle(roomId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.rooms.history(roomId) });
    },
  });
}
