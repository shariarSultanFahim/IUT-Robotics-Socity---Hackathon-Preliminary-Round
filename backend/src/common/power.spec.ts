import { calculatePowerTotals, toRoomBreakdown } from './power';
import { DeviceRecord } from '../devices/devices.types';
import { DeviceStatusId, DeviceTypeId, RoomId } from './devices.constants';

function device(partial: Partial<DeviceRecord>): DeviceRecord {
  return {
    id: partial.id ?? 'x',
    type: (partial.type ?? 'light') as DeviceTypeId,
    room: (partial.room ?? 'drawing') as RoomId,
    label: partial.label ?? 'x',
    status: (partial.status ?? 'off') as DeviceStatusId,
    wattage: partial.wattage ?? 15,
    lastChanged: new Date(),
  };
}

describe('calculatePowerTotals', () => {
  it('counts only ON devices; OFF devices contribute 0 W', () => {
    const devices = [
      device({ room: 'drawing', type: 'fan', wattage: 60, status: 'on' }),
      device({ room: 'drawing', type: 'light', wattage: 15, status: 'on' }),
      device({ room: 'drawing', type: 'light', wattage: 15, status: 'off' }),
    ];
    const totals = calculatePowerTotals(devices);
    expect(totals.drawingWatts).toBe(75);
    expect(totals.totalWatts).toBe(75);
  });

  it('splits watts per room', () => {
    const devices = [
      device({ room: 'drawing', type: 'light', wattage: 15, status: 'on' }),
      device({ room: 'work1', type: 'fan', wattage: 60, status: 'on' }),
      device({ room: 'work2', type: 'fan', wattage: 60, status: 'on' }),
      device({ room: 'work2', type: 'light', wattage: 15, status: 'on' }),
    ];
    const totals = calculatePowerTotals(devices);
    expect(totals.drawingWatts).toBe(15);
    expect(totals.work1Watts).toBe(60);
    expect(totals.work2Watts).toBe(75);
    expect(totals.totalWatts).toBe(150);
    expect(toRoomBreakdown(totals)).toEqual({
      drawing: 15,
      work1: 60,
      work2: 75,
    });
  });

  it('returns all zeros when everything is OFF', () => {
    const devices = [
      device({ status: 'off', wattage: 60 }),
      device({ status: 'off', wattage: 15 }),
    ];
    expect(calculatePowerTotals(devices).totalWatts).toBe(0);
  });
});
