import axios from 'axios';
import type { DashboardStats, FamilyMember, Registration } from '../types';

export type { DashboardStats, FamilyMember, Registration } from '../types';

const baseURL = import.meta.env.VITE_API_BASE?.trim() || '';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err: { response?: { data?: unknown }; message?: string }) => {
    const data = err.response?.data;
    let msg = err.message || 'Request failed';
    if (data && typeof data === 'object' && 'error' in data) {
      msg = String((data as { error: unknown }).error);
      if (msg.includes('FREE setup')) {
        msg = msg.split('\n')[0] ?? msg;
      }
    } else if (typeof data === 'string' && data.includes('<!DOCTYPE')) {
      msg = 'API not found — redeploy or check Vercel API routes';
    }
    return Promise.reject(new Error(msg));
  },
);

export type RegistrationPayload = {
  fullName: string;
  mobile: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  tokenGiven?: boolean;
  members: FamilyMember[];
  notes?: string;
};

export async function fetchStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/api/stats');
  return data;
}

export async function searchRegistrations(q: string): Promise<Registration[]> {
  const { data } = await api.get<Registration[]>('/api/search', { params: { q } });
  return data;
}

export async function checkDuplicate(
  mobile: string,
  excludeRow?: number,
): Promise<{ duplicate: boolean; existing: Registration | null }> {
  const { data } = await api.get('/api/registrations/check-duplicate', {
    params: { mobile, excludeRow },
  });
  return data;
}

export async function findFamilyByMobile(
  mobile: string,
): Promise<{ found: boolean; registration: Registration | null }> {
  const { data } = await api.get('/api/registrations/by-mobile', { params: { mobile } });
  return data;
}

export async function createRegistration(payload: RegistrationPayload): Promise<{ rowIndex: number }> {
  const { data } = await api.post('/api/registrations', payload);
  return data;
}

export async function updateRegistration(
  rowIndex: number,
  payload: RegistrationPayload & { time?: string },
): Promise<void> {
  await api.put(`/api/registrations/${rowIndex}`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function listRegistrations(params: {
  q?: string;
  date?: string;
}): Promise<Registration[]> {
  const { data } = await api.get<Registration[]>('/api/registrations', { params });
  return data;
}

export async function deleteRegistration(rowIndex: number): Promise<void> {
  await api.delete(`/api/registrations/${rowIndex}`);
}

export async function repairRegistration(rowIndex: number): Promise<Registration> {
  const { data } = await api.post<Registration>(`/api/registrations/${rowIndex}/repair`);
  return data;
}

export async function repairAllCorrupt(): Promise<{ repaired: number; deleted: number }> {
  const { data } = await api.post('/api/registrations/repair-all');
  return data;
}

export async function exportRegistrationsExcel(): Promise<Blob> {
  const { data } = await api.get<Blob>('/api/registrations/export', { responseType: 'blob' });
  return data;
}
