export type Role = 'ADMIN' | 'VIEWER';
export type DeviceType = 'fan' | 'light';
export type DeviceStatus = 'on' | 'off';
export type RoomId = 'drawing' | 'work1' | 'work2';
export type AlertType = 'AFTER_HOURS' | 'ALL_DEVICES_ON_TOO_LONG';
export type ChangeSourceId = 'simulator' | 'manual' | 'system';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  type: DeviceType;
  room: RoomId;
  label: string;
  status: DeviceStatus;
  wattage: number;
  lastChanged: string;
}

export interface RoomBreakdown {
  drawing: number;
  work1: number;
  work2: number;
}

export interface Usage {
  currentWatts: number;
  todayKwh: number;
  roomBreakdown: RoomBreakdown;
  calculatedAt: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  room: RoomId | null;
  deviceId: string | null;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
  active: boolean;
}

export type OfficeHoursMode = 'auto' | 'open' | 'closed';

export interface OfficeHoursState {
  mode: OfficeHoursMode;
  withinOfficeHours: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
}

export const ROOM_LABELS: Record<RoomId, string> = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

export const ROOM_ORDER: RoomId[] = ['drawing', 'work1', 'work2'];
