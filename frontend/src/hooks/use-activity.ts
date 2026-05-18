'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { checkinsService } from '@/services/checkins';
import { queryKeys } from '@/lib/query-keys';

/**
 * Paginated check-in activity feed for a room's current cycle. Keeps the
 * previous page visible while the next one loads to avoid UI jumps.
 */
export function useActivity(
  roomId: string,
  cycleId: string | undefined,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: queryKeys.rooms.activity(roomId, page),
    queryFn: () =>
      checkinsService.list(roomId, { cycleId, page, pageSize }),
    enabled: !!roomId && !!cycleId,
    placeholderData: keepPreviousData,
  });
}
