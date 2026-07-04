import { DeviceRecord } from '../devices/devices.types';
import { RoomBreakdown } from '../usage/usage.types';

export interface PowerTotals {
  totalWatts: number;
  drawingWatts: number;
  work1Watts: number;
  work2Watts: number;
}

/**
 * Pure power calculation: sum wattage of every ON device, split per room.
 * OFF devices contribute 0 W. Shared by DevicesService, UsageService and
 * AlertsService so results are always consistent with committed device state.
 */
export function calculatePowerTotals(devices: DeviceRecord[]): PowerTotals {
  let totalWatts = 0;
  let drawingWatts = 0;
  let work1Watts = 0;
  let work2Watts = 0;

  for (const device of devices) {
    if (device.status !== 'on') continue;
    const watts = device.wattage;
    totalWatts += watts;
    switch (device.room) {
      case 'drawing':
        drawingWatts += watts;
        break;
      case 'work1':
        work1Watts += watts;
        break;
      case 'work2':
        work2Watts += watts;
        break;
    }
  }

  return { totalWatts, drawingWatts, work1Watts, work2Watts };
}

export function toRoomBreakdown(totals: PowerTotals): RoomBreakdown {
  return {
    drawing: totals.drawingWatts,
    work1: totals.work1Watts,
    work2: totals.work2Watts,
  };
}
