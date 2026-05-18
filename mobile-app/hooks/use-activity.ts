import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checkinsService } from '@/services/checkins';
import { queryKeys } from '@/constants/query-keys';

/**
 * Current-cycle check-in feed for a room. Refetches on screen focus so
 * the feed stays fresh after navigating back into it.
 */
export function useActivity(roomId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.rooms.activity(roomId),
    queryFn: () => checkinsService.list(roomId, { pageSize: 50 }),
    enabled: !!roomId,
  });

  useFocusEffect(
    useCallback(() => {
      if (roomId) {
        qc.invalidateQueries({
          queryKey: queryKeys.rooms.activity(roomId),
        });
      }
    }, [qc, roomId]),
  );

  return query;
}
