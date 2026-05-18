import api from './api';
import type { CycleDetail, Paginated, CycleSummary, CycleResult } from '@/types/tallyup';

type HistoryItem = CycleSummary & { roomId: string; resultJson: CycleResult | null };

export type TieBreakInput =
  | { pick: 'include_all' }
  | { pick: 'manual'; winners?: string[]; losers?: string[] };

export const cyclesService = {
  async current(roomId: string): Promise<CycleDetail> {
    const { data } = await api.get(`/rooms/${roomId}/cycles/current`);
    return data;
  },
  async history(
    roomId: string,
    page = 1,
    pageSize = 20,
  ): Promise<Paginated<HistoryItem>> {
    const { data } = await api.get(`/rooms/${roomId}/cycles`, {
      params: { page, pageSize },
    });
    return data;
  },
  async get(cycleId: string): Promise<CycleDetail> {
    const { data } = await api.get(`/cycles/${cycleId}`);
    return data;
  },
  async advance(cycleId: string): Promise<{ processed: boolean }> {
    const { data } = await api.post(`/test/cycles/${cycleId}/advance`);
    return data;
  },
  async tieBreak(
    cycleId: string,
    body: TieBreakInput,
  ): Promise<{ resultJson: CycleResult }> {
    const { data } = await api.post(`/cycles/${cycleId}/tie-break`, body);
    return data;
  },
};
