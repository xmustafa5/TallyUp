'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinsService } from '@/services/checkins';
import { queryKeys } from '@/lib/query-keys';
import type { CycleDetail } from '@/types/tallyup';

/**
 * Create a check-in with an optimistic leaderboard bump for the current
 * user, so the +1 button feels instant (<300ms perceived). Rolls back on
 * error and reconciles from the server on settle.
 */
export function useCreateCheckIn(roomId: string, myUserId: string | undefined) {
  const qc = useQueryClient();
  const key = queryKeys.rooms.currentCycle(roomId);

  return useMutation({
    mutationFn: (points: number) =>
      checkinsService.create(roomId, {
        points,
        clientId:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
      }),
    onMutate: async (points) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<CycleDetail>(key);
      if (prev && myUserId) {
        qc.setQueryData<CycleDetail>(key, {
          ...prev,
          leaderboard: prev.leaderboard
            .map((r) =>
              r.userId === myUserId
                ? {
                    ...r,
                    points: Math.min(
                      r.points + points,
                      r.target > 0 ? r.target : r.points + points,
                    ),
                    percent:
                      r.target > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((r.points + points) / r.target) * 100,
                            ),
                          )
                        : r.percent,
                  }
                : r,
            )
            .sort((a, b) => b.percent - a.percent || b.points - a.points),
        });
      }
      return { prev };
    },
    onError: (_err, _points, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
