import api from './api';
import type { MyHistory } from '@/types/tallyup';

export const usersService = {
  async getHistory(): Promise<MyHistory> {
    const { data } = await api.get('/users/me/history');
    return data;
  },
};
