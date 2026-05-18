import api from './api';
import type { RoomDetail, RoomListItem, RoomMember } from '@/types/tallyup';

export interface CreateRoomInput {
  name: string;
  icon?: string | null;
  description?: string | null;
  timezone?: string;
  periodType: 'week' | 'month' | 'custom' | 'oneshot';
  customDays?: number | null;
  startDayOfWeek?: number | null;
  startDayOfMonth?: number | null;
  winnerRule?: string;
  winnerN?: number | null;
  loserRule?: string;
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
  async patch(id: string, input: Partial<CreateRoomInput>): Promise<RoomDetail> {
    const { data } = await api.patch(`/rooms/${id}`, input);
    return data;
  },
  async start(id: string, startAtNextBoundary = false): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/start`, { startAtNextBoundary });
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
  async transferAdmin(id: string, toUserId: string): Promise<RoomDetail> {
    const { data } = await api.post(`/rooms/${id}/transfer-admin`, { toUserId });
    return data;
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
  async removeMember(id: string, userId: string): Promise<void> {
    await api.delete(`/rooms/${id}/members/${userId}`);
  },
  async leave(id: string): Promise<void> {
    await api.post(`/rooms/${id}/leave`);
  },
};
