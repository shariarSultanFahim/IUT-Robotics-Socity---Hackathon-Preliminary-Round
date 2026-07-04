import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UsageService } from './usage.service';
import { ClockService } from '../common/clock.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceRecord } from '../devices/devices.types';
import { RoomId } from '../common/devices.constants';

function makeClock(): ClockService {
  const config = {
    get: (key: string, def?: unknown) =>
      key === 'OFFICE_TIMEZONE'
        ? 'Asia/Dhaka'
        : key === 'OFFICE_START_HOUR'
          ? 9
          : key === 'OFFICE_END_HOUR'
            ? 17
            : def,
  } as unknown as ConfigService;
  return new ClockService(config);
}

class FakeDevices {
  records: DeviceRecord[] = [];
  snapshotRecords(): DeviceRecord[] {
    return this.records.map((d) => ({ ...d }));
  }
}

function dev(room: RoomId, wattage: number, on: boolean): DeviceRecord {
  return {
    id: `${room}-x-${wattage}-${on}`,
    type: wattage === 60 ? 'fan' : 'light',
    room,
    label: 'x',
    status: on ? 'on' : 'off',
    wattage,
    lastChanged: new Date(),
  };
}

describe('UsageService (in-memory)', () => {
  let devices: FakeDevices;
  let clock: ClockService;
  let service: UsageService;

  function build(startIso: string) {
    clock = makeClock();
    jest.spyOn(clock, 'now').mockReturnValue(new Date(startIso));
    service = new UsageService(
      devices as unknown as DevicesService,
      clock,
      { emit: jest.fn() } as unknown as EventEmitter2,
      new SchedulerRegistry(),
    );
  }

  beforeEach(() => {
    devices = new FakeDevices();
  });

  it('computes current watts and room breakdown from device state', () => {
    build('2026-07-03T04:00:00Z');
    devices.records = [
      dev('drawing', 60, true), // 60
      dev('drawing', 15, true), // 15
      dev('work1', 60, true), // 60
      dev('work2', 15, false), // off
    ];
    expect(service.getCurrentWatts()).toBe(135);
    expect(service.getRoomBreakdown()).toEqual({
      drawing: 75,
      work1: 60,
      work2: 0,
    });
  });

  it('accumulates kWh over elapsed time using the watts in effect', () => {
    build('2026-07-03T04:00:00Z');
    devices.records = [dev('drawing', 100 as number, true)]; // 100 W

    // First read fixes "watts in effect" = 100 from this instant.
    expect(service.getTodayKwh(new Date('2026-07-03T04:00:00Z'))).toBe(0);
    // One hour later at 100 W => 0.1 kWh.
    expect(service.getTodayKwh(new Date('2026-07-03T05:00:00Z'))).toBeCloseTo(
      0.1,
      6,
    );
    // Another hour => 0.2 kWh total.
    expect(service.getTodayKwh(new Date('2026-07-03T06:00:00Z'))).toBeCloseTo(
      0.2,
      6,
    );
  });

  it('resets the daily estimate at local (Asia/Dhaka) midnight', () => {
    build('2026-07-03T04:00:00Z'); // Jul 3, 10:00 Dhaka
    devices.records = [dev('drawing', 100 as number, true)];
    service.getTodayKwh(new Date('2026-07-03T04:00:00Z'));
    const beforeMidnight = service.getTodayKwh(
      new Date('2026-07-03T10:00:00Z'),
    );
    expect(beforeMidnight).toBeGreaterThan(0);

    // 18:00Z is the next Dhaka midnight -> day rolls over -> reset.
    const afterMidnight = service.getTodayKwh(new Date('2026-07-03T18:30:00Z'));
    expect(afterMidnight).toBe(0);
  });

  it('produces a full usage snapshot', () => {
    build('2026-07-03T04:00:00Z');
    devices.records = [dev('drawing', 15, true)];
    const snapshot = service.getUsageSnapshot(new Date('2026-07-03T04:00:00Z'));
    expect(snapshot.currentWatts).toBe(15);
    expect(snapshot.roomBreakdown.drawing).toBe(15);
    expect(typeof snapshot.todayKwh).toBe('number');
    expect(snapshot.calculatedAt).toBe('2026-07-03T04:00:00.000Z');
  });
});
