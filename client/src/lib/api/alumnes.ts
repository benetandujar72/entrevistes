import { apiClient } from './client';
import type { Alumne } from '$lib/types';

export const alumnes = {
  list: async (): Promise<Alumne[]> => {
    const response = await apiClient.get<Alumne[]>('/alumnes');
    return response.data;
  },
  
  get: async (id: string): Promise<Alumne> => {
    const response = await apiClient.get<Alumne>(`/alumnes/${id}`);
    return response.data;
  },
  
  create: async (data: Omit<Alumne, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string }> => {
    const response = await apiClient.post<{ id: string }>('/alumnes', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Alumne>): Promise<void> => {
    await apiClient.put(`/alumnes/${id}`, data);
  },
  
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/alumnes/${id}`);
  },
};
