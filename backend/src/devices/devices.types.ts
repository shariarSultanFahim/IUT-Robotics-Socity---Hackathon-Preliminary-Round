import {
  DeviceStatusId,
  DeviceTypeId,
  RoomId,
} from '../common/devices.constants';

/** In-memory device record — the single source of truth (not persisted). */
export interface DeviceRecord {
  id: string;
  type: DeviceTypeId;
  room: RoomId;
  label: string;
  status: DeviceStatusId;
  wattage: number;
  lastChanged: Date;
}

/** Public device shape returned by REST / Socket.IO (PROJECT_BRIEF §11). */
export interface DeviceView {
  id: string;
  type: DeviceTypeId;
  room: RoomId;
  label: string;
  status: DeviceStatusId;
  wattage: number;
  lastChanged: string;
}

export function toDeviceView(device: DeviceRecord): DeviceView {
  return {
    id: device.id,
    type: device.type,
    room: device.room,
    label: device.label,
    status: device.status,
    wattage: device.wattage,
    lastChanged: device.lastChanged.toISOString(),
  };
}

export interface RoomSummary {
  room: RoomId;
  displayName: string;
  devices: DeviceView[];
  activeFans: number;
  activeLights: number;
  totalFans: number;
  totalLights: number;
  watts: number;
  lastChange: string | null;
}

export interface OfficeSummary {
  totalDevices: number;
  activeFans: number;
  activeLights: number;
  totalWatts: number;
  rooms: RoomSummary[];
}
