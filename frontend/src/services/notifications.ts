import api from './api';
import type { AppNotification, Paginated } from '@/types/tallyup';

export const notificationsService = {
  async list(
    opts: { unread?: boolean; page?: number; pageSize?: number } = {},
  ): Promise<Paginated<AppNotification>> {
    const { data } = await api.get('/notifications', { params: opts });
    return data;
  },
  async markRead(ids: string[] | 'all'): Promise<void> {
    await api.post('/notifications/mark-read', { ids });
  },
};
