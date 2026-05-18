import api from './api';
import type { RoomTemplate } from '@/types/tallyup';

export const templatesService = {
  async list(): Promise<RoomTemplate[]> {
    const { data } = await api.get('/templates');
    return data;
  },
};
