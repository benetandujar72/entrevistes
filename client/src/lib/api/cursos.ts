import { apiClient } from './client';
import type { Curs } from '$lib/types';

export const cursos = {
  list: async (): Promise<Curs[]> => {
    const response = await apiClient.get<Curs[]>('/cursos');
    return response.data;
  },
  
  get: async (any: string): Promise<Curs> => {
    const response = await apiClient.get<Curs>(`/cursos/${any}`);
    return response.data;
  },
};
