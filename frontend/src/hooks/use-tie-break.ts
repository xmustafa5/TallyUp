'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cyclesService, type TieBreakInput } from '@/services/cycles';
import { queryKeys } from '@/lib/query-keys';

/**
 * Resolve a tie-break for a cycle (admin only). Invalidates the cycle
 * detail query so the result + banner refetch on success.
 */
export function useTieBreak(cycleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TieBreakInput) => cyclesService.tieBreak(cycleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cycles.detail(cycleId) });
    },
  });
}
