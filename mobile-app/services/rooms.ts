import api from './api';
import type {
  RoomDetail,
  RoomListItem,
  RoomMember,
  PeriodType,
  WinnerRule,
  LoserRule,
} from '@/types/tallyup';

export interface CreateRoomInput {
  name: string;
  icon?: string | null;
  description?: string | null;
  periodType: PeriodType;
  customDays?: number | null;
  startDayOfWeek?: number | null;
  startDayOfMonth?: number | null;
  winnerRule?: WinnerRule;
  winnerN?: number | null;
  loserRule?: LoserRule;
  loserN?: number | null;
  capAtTarget?: boolean;
  stake?: string | null;
}

export const roomsService = {
  async list(): Promise<RoomListItem[]> {
    const { data } = await api.get('/rooms');
    return data;
  },
  async get(id: string): Promise<RoomDetail> {
    const { data } = await api.get(`/rooms/${id}`);
    return data;
  },
  async create(input: CreateRoomInput): Promise<RoomDetail> {
    const { data } = await api.post('/rooms', input);
    return data;
  },
  async start(id: string): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/start`, {
      startAtNextBoundary: false,
    });
    return data;
  },
  async pause(id: string): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/pause`);
    return data;
  },
  async resume(id: string): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/resume`);
    return data;
  },
  async archive(id: string): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/archive`);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`);
  },
  async members(id: string): Promise<RoomMember[]> {
    const { data } = await api.get(`/rooms/${id}/members`);
    return data;
  },
  async patchMember(
    id: string,
    userId: string,
    body: { target?: number; includeInCurrentCycle?: boolean | null },
  ): Promise<RoomMember> {
    const { data } = await api.patch(`/rooms/${id}/members/${userId}`, body);
    return data;
  },
  async transferAdmin(id: string, toUserId: string): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/transfer-admin`, {
      toUserId,
    });
    return data;
  },
  async leave(id: string): Promise<void> {
    await api.post(`/rooms/${id}/leave`);
  },
};
