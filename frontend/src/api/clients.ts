import axios from 'axios';
import type { Client } from '../types';

export const clientsApi = {
  getAll: () => axios.get<Client[]>('/api/clients').then(r => r.data),
  getOne: (id: number) => axios.get<Client>(`/api/clients/${id}`).then(r => r.data),
  create: (data: Partial<Client>) => axios.post<Client>('/api/clients', data).then(r => r.data),
  update: (id: number, data: Partial<Client>) => axios.put<Client>(`/api/clients/${id}`, data).then(r => r.data),
  remove: (id: number) => axios.delete(`/api/clients/${id}`),
};
