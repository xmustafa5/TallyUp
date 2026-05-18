'use client';

import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users';
import { queryKeys } from '@/lib/query-keys';

/** The signed-in user's global stats + recent cycle outcomes. */
export function useMyHistory() {
  return useQuery({
    queryKey: queryKeys.users.history,
    queryFn: usersService.getHistory,
  });
}
