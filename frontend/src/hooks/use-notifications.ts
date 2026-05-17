'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';
import { queryKeys } from '@/lib/query-keys';

export function useNotifications(unread = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ unread }),
    queryFn: () => notificationsService.list({ unread }),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | 'all') => notificationsService.markRead(ids),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
