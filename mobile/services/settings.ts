import api from './api';
import type { ApiResponse } from '@/types/api';

interface MessageData {
  success: boolean;
  message: string;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<MessageData> {
  const { data } = await api.put<ApiResponse<never> & MessageData>(
    '/auth/change-password',
    { currentPassword, newPassword },
  );
  return data;
}

export async function deleteAccount(password: string): Promise<MessageData> {
  const { data } = await api.delete<ApiResponse<never> & MessageData>(
    '/auth/account',
    { data: { password } },
  );
  return data;
}
