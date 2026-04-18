'use client';

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

const PREFERENCES_KEY = ['notifications', 'preferences'] as const;
const INBOX_KEY = ['notifications', 'inbox'] as const;
const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: getNotificationPreferences,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationPreferencesPayload) =>
      updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
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
    queryKey: [...INBOX_KEY, params],
    queryFn: () => listNotifications(params),
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
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
      queryClient.invalidateQueries({ queryKey: INBOX_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INBOX_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
