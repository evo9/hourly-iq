import axios from 'axios';
import type { DashboardData } from '../types';

export const dashboardApi = {
  get: () => axios.get<DashboardData>('/api/dashboard').then(r => r.data),
};
