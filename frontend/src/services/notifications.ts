import api from './api';
import type { ApiResponse } from '@/types/api';

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
