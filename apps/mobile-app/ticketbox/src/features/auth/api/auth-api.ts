import { apiClient } from '@/lib/api';
import type { ApiMessageResponse, AuthResponse, User } from '@/features/auth/types/auth.types';

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  async me() {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async logout() {
    const response = await apiClient.post<ApiMessageResponse>('/auth/logout');
    return response.data;
  },
};
