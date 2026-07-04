import { api } from './axios';
import type {
  Alert,
  AuthUser,
  Device,
  DeviceStatus,
  OfficeHoursMode,
  OfficeHoursState,
  Usage,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<{ accessToken: string; user: AuthUser }>('/api/auth/login', {
        email,
        password,
      })
      .then((r) => r.data),
  logout: () => api.post('/api/auth/logout').then((r) => r.data),
  me: () => api.get<AuthUser>('/api/auth/me').then((r) => r.data),
};

export const dataApi = {
  devices: () => api.get<Device[]>('/api/devices').then((r) => r.data),
  usage: () => api.get<Usage>('/api/usage').then((r) => r.data),
  alerts: () => api.get<Alert[]>('/api/alerts').then((r) => r.data),

  setDeviceStatus: (id: string, status: DeviceStatus) =>
    api
      .patch<Device>(`/api/devices/${id}/status`, { status })
      .then((r) => r.data),

  officeHours: () =>
    api.get<OfficeHoursState>('/api/office-hours').then((r) => r.data),

  setOfficeHours: (mode: OfficeHoursMode) =>
    api
      .patch<OfficeHoursState>('/api/office-hours', { mode })
      .then((r) => r.data),
};
