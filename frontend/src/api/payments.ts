import axios from 'axios';
import type { Payment } from '../types';

export const paymentsApi = {
  getAll: (clientId?: number) =>
    axios.get<Payment[]>('/api/payments', { params: clientId ? { clientId } : {} }).then(r => r.data),
  getOne: (id: number) => axios.get<Payment>(`/api/payments/${id}`).then(r => r.data),
  create: (data: Partial<Payment>) => axios.post<Payment>('/api/payments', data).then(r => r.data),
  update: (id: number, data: Partial<Payment>) => axios.put<Payment>(`/api/payments/${id}`, data).then(r => r.data),
  remove: (id: number) => axios.delete(`/api/payments/${id}`),
};
