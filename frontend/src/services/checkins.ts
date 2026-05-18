import api from './api';
import type { CheckInActivity, CheckInResult, Paginated } from '@/types/tallyup';

export const checkinsService = {
  async create(
    roomId: string,
    body: { points: number; note?: string | null; clientId?: string },
  ): Promise<CheckInResult> {
    const { data } = await api.post(`/rooms/${roomId}/check-ins`, body);
    return data;
  },
  async list(
    roomId: string,
    params: { cycleId?: string; userId?: string; page?: number; pageSize?: number } = {},
  ): Promise<Paginated<CheckInActivity>> {
    const { data } = await api.get(`/rooms/${roomId}/check-ins`, { params });
    return data;
  },
  async undo(checkInId: string): Promise<void> {
    await api.delete(`/check-ins/${checkInId}`);
  },
};
