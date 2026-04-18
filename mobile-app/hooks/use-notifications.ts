import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  registerDevice,
  removeDevice,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notifications';
import type {
  UpdateNotificationPreferencesPayload,
  ListNotificationsParams,
} from '@/services/notifications';
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

export function useNotificationsInbox(params: ListNotificationsParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.notifications.inbox, params],
    queryFn: () => listNotifications(params),
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}
