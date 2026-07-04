import { RoomId } from '../common/devices.constants';

export type AlertTypeId = 'AFTER_HOURS' | 'ALL_DEVICES_ON_TOO_LONG';

/** In-memory active alert record (not persisted). */
export interface ActiveAlert {
  id: string;
  dedupeKey: string;
  type: AlertTypeId;
  room: RoomId | null;
  deviceId: string | null;
  message: string;
  triggeredAt: Date;
}

/** Public alert shape returned by REST / Socket.IO / Discord. */
export interface AlertView {
  id: string;
  type: AlertTypeId;
  room: RoomId | null;
  deviceId: string | null;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
  active: boolean;
}

export function toAlertView(
  alert: ActiveAlert,
  opts: { active: boolean; resolvedAt?: Date } = { active: true },
): AlertView {
  return {
    id: alert.id,
    type: alert.type,
    room: alert.room,
    deviceId: alert.deviceId,
    message: alert.message,
    triggeredAt: alert.triggeredAt.toISOString(),
    resolvedAt: opts.resolvedAt ? opts.resolvedAt.toISOString() : null,
    active: opts.active,
  };
}
