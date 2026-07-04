/**
 * Canonical domain constants for the Office Device Monitor.
 *
 * Exactly 15 devices: 3 rooms x (2 fans + 3 lights). These IDs, rooms and
 * wattages are the single authoritative definition used to seed the in-memory
 * DevicesService on startup. Monitoring data is NOT persisted, so these are
 * plain string-literal domain types (no Prisma enums).
 */

export const FAN_WATTAGE = 60;
export const LIGHT_WATTAGE = 15;

export const ROOM_IDS = ['drawing', 'work1', 'work2'] as const;
export type RoomId = (typeof ROOM_IDS)[number];

export const DEVICE_TYPES = ['fan', 'light'] as const;
export type DeviceTypeId = (typeof DEVICE_TYPES)[number];

export const DEVICE_STATUSES = ['on', 'off'] as const;
export type DeviceStatusId = (typeof DEVICE_STATUSES)[number];

export const CHANGE_SOURCES = ['simulator', 'manual', 'system'] as const;
export type ChangeSourceId = (typeof CHANGE_SOURCES)[number];

/** Friendly, human-readable room names for Discord / labels. */
export const ROOM_DISPLAY_NAME: Record<RoomId, string> = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

/** Accepted aliases for `!room <name>` and API lookups. */
export const ROOM_ALIASES: Record<string, RoomId> = {
  drawing: 'drawing',
  'drawing room': 'drawing',
  work1: 'work1',
  'work room 1': 'work1',
  'work 1': 'work1',
  work2: 'work2',
  'work room 2': 'work2',
  'work 2': 'work2',
};

export interface DeviceSeed {
  id: string;
  type: DeviceTypeId;
  room: RoomId;
  label: string;
  wattage: number;
}

function buildRoomDevices(room: RoomId): DeviceSeed[] {
  const devices: DeviceSeed[] = [];
  for (let i = 1; i <= 2; i++) {
    devices.push({
      id: `${room}-fan-${i}`,
      type: 'fan',
      room,
      label: `Fan ${i}`,
      wattage: FAN_WATTAGE,
    });
  }
  for (let i = 1; i <= 3; i++) {
    devices.push({
      id: `${room}-light-${i}`,
      type: 'light',
      room,
      label: `Light ${i}`,
      wattage: LIGHT_WATTAGE,
    });
  }
  return devices;
}

/** The exactly-15 fixed device definitions in stable order. */
export const DEVICE_SEEDS: DeviceSeed[] = ROOM_IDS.flatMap((room) =>
  buildRoomDevices(room),
);

export const DEVICE_IDS: string[] = DEVICE_SEEDS.map((d) => d.id);

export const EXPECTED_DEVICE_COUNT = 15;

export function resolveRoomAlias(input: string): RoomId | null {
  const key = input.trim().toLowerCase();
  return ROOM_ALIASES[key] ?? null;
}
