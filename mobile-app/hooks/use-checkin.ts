import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinsService } from '@/services/checkins';
import { useCheckinQueue } from '@/stores/checkin-queue';
import { queryKeys } from '@/constants/query-keys';
import type { CycleDetail } from '@/types/tallyup';

function newClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Optimistically bump the current user's leaderboard row, then attempt
 * the request. On network failure the check-in is queued (PRD 9.3) and
 * replayed later by the offline queue; server idempotency on
 * (userId, clientId) makes replay safe.
 */
export function useCreateCheckIn(roomId: string, myUserId: string | undefined) {
  const qc = useQueryClient();
  const enqueue = useCheckinQueue((s) => s.enqueue);
  const key = queryKeys.rooms.currentCycle(roomId);

  return useMutation({
    mutationFn: async (points: number) => {
      const clientId = newClientId();
      try {
        return await checkinsService.create(roomId, { points, clientId });
      } catch (err) {
        // Network error -> queue for later replay. Re-throw other errors
        // (e.g. 400 target reached, 429 rate limited) so the UI can show.
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === undefined) {
          enqueue({
            roomId,
            points,
            clientId,
            createdAtClient: Date.now(),
          });
          return null;
        }
        throw err;
      }
    },
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
