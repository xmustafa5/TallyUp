import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users';
import { queryKeys } from '@/constants/query-keys';

export function useMyHistory() {
  return useQuery({
    queryKey: queryKeys.users.history,
    queryFn: usersService.getHistory,
  });
}
