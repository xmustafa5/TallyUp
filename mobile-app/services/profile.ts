import api from './api';
import type { ApiResponse } from '@/types/api';
import type { AuthUser } from '@/stores/auth.store';

interface UpdateProfilePayload {
  name?: string;
  birthdate?: string;
  pubertyAge?: number | null;
}

export type { UpdateProfilePayload };

export async function getProfile(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>('/profile');
  return data.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const { data } = await api.put<ApiResponse<AuthUser>>('/profile', payload);
  return data.data;
}
