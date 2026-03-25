import api from './api';
import type { ApiResponse } from '@/types/api';
import type { AuthUser } from '@/stores/auth.store';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthData {
  user: AuthUser;
  tokens: AuthTokens;
}

interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export type { AuthData, RegisterPayload, LoginPayload };

export async function registerUser(payload: RegisterPayload): Promise<AuthData> {
  const { data } = await api.post<ApiResponse<AuthData>>('/auth/register', payload);
  return data.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthData> {
  const { data } = await api.post<ApiResponse<AuthData>>('/auth/login', payload);
  return data.data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>('/auth/me');
  return data.data;
}
