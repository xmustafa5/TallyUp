'use client';

import { useQuery } from '@tanstack/react-query';
import { templatesService } from '@/services/templates';
import { queryKeys } from '@/lib/query-keys';

/** Public room templates used to prefill the create-room form. */
export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates.list,
    queryFn: templatesService.list,
  });
}
