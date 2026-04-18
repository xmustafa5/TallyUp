import api from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export type NotificationType =
  | 'PRAYER_REMINDER'
  | 'GOAL_REMINDER'
  | 'STREAK_REMINDER'
  | 'MILESTONE';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  onlyUnread?: boolean;
}

export interface NotificationPreferences {
  id: string;
  prayerReminders: boolean;
  goalReminders: boolean;
  streakReminders: boolean;
  milestones: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesPayload {
  prayerReminders?: boolean;
  goalReminders?: boolean;
  streakReminders?: boolean;
  milestones?: boolean;
}

export async function registerDevice(
  token: string,
  platform: string,
): Promise<void> {
  await api.post('/notifications/devices', { token, platform });
}

export async function removeDevice(token: string): Promise<void> {
  await api.delete(`/notifications/devices/${encodeURIComponent(token)}`);
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await api.get<ApiResponse<NotificationPreferences>>(
    '/notifications/preferences',
  );
  return data.data;
}

export async function updateNotificationPreferences(
  payload: UpdateNotificationPreferencesPayload,
): Promise<NotificationPreferences> {
  const { data } = await api.put<ApiResponse<NotificationPreferences>>(
    '/notifications/preferences',
    payload,
  );
  return data.data;
}

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<PaginatedResponse<NotificationItem>> {
  const { data } = await api.get<PaginatedResponse<NotificationItem>>(
    '/notifications',
    { params },
  );
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ unreadCount: number }>>(
    '/notifications/unread-count',
  );
  return data.data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const { data } = await api.patch<ApiResponse<NotificationItem>>(
    `/notifications/${id}/read`,
  );
  return data.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await api.post<ApiResponse<{ updated: number }>>(
    '/notifications/read-all',
  );
  return data.data.updated;
}
