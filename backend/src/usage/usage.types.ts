import { RoomId } from '../common/devices.constants';

export type RoomBreakdown = Record<RoomId, number>;

export interface UsageSnapshot {
  currentWatts: number;
  todayKwh: number;
  roomBreakdown: RoomBreakdown;
  calculatedAt: string;
}
