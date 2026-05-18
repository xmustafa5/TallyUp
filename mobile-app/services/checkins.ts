import api from './api';
import type { CheckInResult } from '@/types/tallyup';

export const checkinsService = {
  async create(
    roomId: string,
    body: { points: number; note?: string | null; clientId?: string },
  ): Promise<CheckInResult> {
    const { data } = await api.post(`/rooms/${roomId}/check-ins`, body);
    return data;
  },
  async undo(checkInId: string): Promise<void> {
    await api.delete(`/check-ins/${checkInId}`);
  },
};
