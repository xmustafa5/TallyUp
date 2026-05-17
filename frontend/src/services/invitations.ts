import api from './api';
import type { Invitation, UserSummary } from '@/types/tallyup';

export const invitationsService = {
  async send(roomId: string, toPublicId: string): Promise<Invitation> {
    const { data } = await api.post('/invitations', { roomId, toPublicId });
    return data;
  },
  async incoming(): Promise<Invitation[]> {
    const { data } = await api.get('/invitations/incoming');
    return data;
  },
  async outgoing(roomId: string): Promise<Invitation[]> {
    const { data } = await api.get(`/invitations/outgoing/${roomId}`);
    return data;
  },
  async accept(id: string): Promise<Invitation> {
    const { data } = await api.post(`/invitations/${id}/accept`);
    return data;
  },
  async reject(id: string): Promise<Invitation> {
    const { data } = await api.post(`/invitations/${id}/reject`);
    return data;
  },
  async cancel(id: string): Promise<Invitation> {
    const { data } = await api.post(`/invitations/${id}/cancel`);
    return data;
  },
};

export const usersService = {
  async lookupByPublicId(publicId: string): Promise<UserSummary> {
    const { data } = await api.get(`/users/by-public-id/${publicId}`);
    return data;
  },
};
