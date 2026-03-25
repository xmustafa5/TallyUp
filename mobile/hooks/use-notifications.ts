import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  registerDevice,
  removeDevice,
} from '@/services/notifications';
import type { UpdateNotificationPreferencesPayload } from '@/services/notifications';
import { queryKeys } from '@/constants/query-keys';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: getNotificationPreferences,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesPayload) =>
      updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences });
    },
  });
}

export function useRegisterDevice() {
  return useMutation({
    mutationFn: ({ token, platform }: { token: string; platform: string }) =>
      registerDevice(token, platform),
  });
}

export function useRemoveDevice() {
  return useMutation({
    mutationFn: (token: string) => removeDevice(token),
  });
}
