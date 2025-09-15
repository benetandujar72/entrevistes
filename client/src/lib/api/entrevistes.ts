import { apiClient } from './client';
import type { Entrevista } from '$lib/types';

export const entrevistes = {
  list: async (): Promise<Entrevista[]> => {
    const response = await apiClient.get<Entrevista[]>('/entrevistes');
    return response.data;
  },
  
  get: async (id: string): Promise<Entrevista> => {
    const response = await apiClient.get<Entrevista>(`/entrevistes/${id}`);
    return response.data;
  },
  
  create: async (data: Omit<Entrevista, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string }> => {
    const response = await apiClient.post<{ id: string }>('/entrevistes', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Entrevista>): Promise<void> => {
    await apiClient.put(`/entrevistes/${id}`, data);
  },
  
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/entrevistes/${id}`);
  },
};
