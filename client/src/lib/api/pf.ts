import { apiClient } from './client';
import type { PersonalFamiliar } from '$lib/types';

export const pf = {
  list: async (): Promise<PersonalFamiliar[]> => {
    const response = await apiClient.get<PersonalFamiliar[]>('/pf');
    return response.data;
  },
  
  get: async (id: string): Promise<PersonalFamiliar> => {
    const response = await apiClient.get<PersonalFamiliar>(`/pf/${id}`);
    return response.data;
  },
  
  create: async (data: Omit<PersonalFamiliar, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string }> => {
    const response = await apiClient.post<{ id: string }>('/pf', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<PersonalFamiliar>): Promise<void> => {
    await apiClient.put(`/pf/${id}`, data);
  },
  
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/pf/${id}`);
  },
};
