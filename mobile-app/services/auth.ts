import api from './api';
import type { AuthResult, FullProfile } from '@/types/tallyup';

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
  locale?: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { data } = await api.post('/auth/register', input);
    return data;
  },
  async login(email: string, password: string): Promise<AuthResult> {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
  async me(): Promise<FullProfile> {
    const { data } = await api.get('/users/me');
    return data;
  },
};
