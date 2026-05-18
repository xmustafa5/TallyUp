import { useQuery } from '@tanstack/react-query';
import { templatesService } from '@/services/templates';
import { queryKeys } from '@/constants/query-keys';

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates.list,
    queryFn: templatesService.list,
  });
}
