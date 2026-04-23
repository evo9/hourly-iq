import axios from 'axios';
import type { Invoice } from '../types';

export const invoicesApi = {
  getAll: (clientId?: number) =>
    axios.get<Invoice[]>('/api/invoices', { params: clientId ? { clientId } : {} }).then(r => r.data),
  getOne: (id: number) => axios.get<Invoice>(`/api/invoices/${id}`).then(r => r.data),
  create: (data: Partial<Invoice>) => axios.post<Invoice>('/api/invoices', data).then(r => r.data),
  update: (id: number, data: Partial<Invoice>) => axios.put<Invoice>(`/api/invoices/${id}`, data).then(r => r.data),
  remove: (id: number) => axios.delete(`/api/invoices/${id}`),
};
