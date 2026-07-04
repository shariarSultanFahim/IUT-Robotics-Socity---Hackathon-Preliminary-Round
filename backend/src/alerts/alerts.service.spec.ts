import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlertsService } from './alerts.service';
import { ClockService } from '../common/clock.service';
import { DevicesService } from '../devices/devices.service';
import { DeviceRecord } from '../devices/devices.types';
import { RoomId } from '../common/devices.constants';
import { DOMAIN_EVENTS } from '../common/events';

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

function roomDevices(
  room: RoomId,
  on: boolean,
  lastChanged: Date,
): DeviceRecord[] {
  const out: DeviceRecord[] = [];
  for (let i = 1; i <= 2; i++)
    out.push({
      id: `${room}-fan-${i}`,
      type: 'fan',
      room,
      label: `Fan ${i}`,
      status: on ? 'on' : 'off',
      wattage: 60,
      lastChanged,
    });
  for (let i = 1; i <= 3; i++)
    out.push({
      id: `${room}-light-${i}`,
      type: 'light',
      room,
      label: `Light ${i}`,
      status: on ? 'on' : 'off',
      wattage: 15,
      lastChanged,
    });
  return out;
}

const AFTER_HOURS = new Date('2026-07-02T19:00:00Z'); // Dhaka 01:00 (outside)
const OFFICE_HOURS = new Date('2026-07-02T06:00:00Z'); // Dhaka 12:00 (inside)
const THREE_HOURS_BEFORE = new Date('2026-07-02T03:00:00Z');

describe('AlertsService (in-memory)', () => {
  let devices: FakeDevices;
  let emitter: { emit: jest.Mock };
  let service: AlertsService;

  beforeEach(() => {
    devices = new FakeDevices();
    emitter = { emit: jest.fn() };
    service = new AlertsService(
      devices as unknown as DevicesService,
      makeClock(),
      emitter as unknown as EventEmitter2,
    );
  });

  describe('Rule 1 — after hours', () => {
    it('adds one active alert per ON device and emits alert.triggered once', () => {
      devices.records = [
        {
          id: 'drawing-fan-1',
          type: 'fan',
          room: 'drawing',
          label: 'Fan 1',
          status: 'on',
          wattage: 60,
          lastChanged: AFTER_HOURS,
        },
      ];
      service.evaluateAll(AFTER_HOURS);
      service.evaluateAll(AFTER_HOURS); // still true -> no duplicate

      const active = service.getActiveAlerts();
      expect(active).toHaveLength(1);
      expect(active[0]).toMatchObject({
        type: 'AFTER_HOURS',
        deviceId: 'drawing-fan-1',
        active: true,
      });
      expect(
        emitter.emit.mock.calls.filter(
          (c) => c[0] === DOMAIN_EVENTS.ALERT_TRIGGERED,
        ),
      ).toHaveLength(1);
    });

    it('clears the alert when the device turns OFF (emits alert.resolved)', () => {
      devices.records = [
        {
          id: 'drawing-fan-1',
          type: 'fan',
          room: 'drawing',
          label: 'Fan 1',
          status: 'on',
          wattage: 60,
          lastChanged: AFTER_HOURS,
        },
      ];
      service.evaluateAll(AFTER_HOURS);
      devices.records[0].status = 'off';
      service.evaluateAll(AFTER_HOURS);

      expect(service.getActiveAlerts()).toHaveLength(0);
      const resolved = emitter.emit.mock.calls.find(
        (c) => c[0] === DOMAIN_EVENTS.ALERT_RESOLVED,
      )![1];
      expect(resolved.alert.active).toBe(false);
      expect(resolved.alert.resolvedAt).not.toBeNull();
    });

    it('clears when office hours begin', () => {
      devices.records = [
        {
          id: 'drawing-fan-1',
          type: 'fan',
          room: 'drawing',
          label: 'Fan 1',
          status: 'on',
          wattage: 60,
          lastChanged: AFTER_HOURS,
        },
      ];
      service.evaluateAll(AFTER_HOURS);
      service.evaluateAll(OFFICE_HOURS);
      expect(service.getActiveAlerts()).toHaveLength(0);
    });
  });

  describe('Rule 2 — whole room ON > 2 hours', () => {
    it('adds a room alert when all 5 devices have been ON > 2h', () => {
      devices.records = roomDevices('work1', true, THREE_HOURS_BEFORE);
      service.evaluateAll(OFFICE_HOURS);
      const active = service.getActiveAlerts();
      expect(active).toHaveLength(1);
      expect(active[0]).toMatchObject({
        type: 'ALL_DEVICES_ON_TOO_LONG',
        room: 'work1',
      });
    });

    it('does NOT add the alert if a device turned ON recently', () => {
      const recs = roomDevices('work1', true, THREE_HOURS_BEFORE);
      recs[4].lastChanged = OFFICE_HOURS; // one just changed
      devices.records = recs;
      service.evaluateAll(OFFICE_HOURS);
      expect(service.getActiveAlerts()).toHaveLength(0);
    });

    it('clears when any device turns OFF', () => {
      devices.records = roomDevices('work1', true, THREE_HOURS_BEFORE);
      service.evaluateAll(OFFICE_HOURS);
      devices.records[0].status = 'off';
      service.evaluateAll(OFFICE_HOURS);
      expect(service.getActiveAlerts()).toHaveLength(0);
    });
  });

  describe('office-hours override drives Rule 1', () => {
    it("forces after-hours alerts even at midday when clock mode is 'closed'", () => {
      const clock = makeClock();
      clock.setOfficeMode('closed');
      const svc = new AlertsService(
        devices as unknown as DevicesService,
        clock,
        emitter as unknown as EventEmitter2,
      );
      devices.records = [
        {
          id: 'drawing-fan-1',
          type: 'fan',
          room: 'drawing',
          label: 'Fan 1',
          status: 'on',
          wattage: 60,
          lastChanged: OFFICE_HOURS,
        },
      ];
      // OFFICE_HOURS is normally within hours, but 'closed' forces after-hours.
      svc.evaluateAll(OFFICE_HOURS);
      expect(svc.getActiveAlerts()).toHaveLength(1);
      expect(svc.getActiveAlerts()[0].type).toBe('AFTER_HOURS');
    });

    it("suppresses after-hours alerts at night when clock mode is 'open'", () => {
      const clock = makeClock();
      clock.setOfficeMode('open');
      const svc = new AlertsService(
        devices as unknown as DevicesService,
        clock,
        emitter as unknown as EventEmitter2,
      );
      devices.records = [
        {
          id: 'drawing-fan-1',
          type: 'fan',
          room: 'drawing',
          label: 'Fan 1',
          status: 'on',
          wattage: 60,
          lastChanged: AFTER_HOURS,
        },
      ];
      svc.evaluateAll(AFTER_HOURS); // normally after-hours -> forced open
      expect(svc.getActiveAlerts()).toHaveLength(0);
    });
  });

  it('getActiveAlerts returns only active alerts', () => {
    devices.records = [
      {
        id: 'drawing-fan-1',
        type: 'fan',
        room: 'drawing',
        label: 'Fan 1',
        status: 'on',
        wattage: 60,
        lastChanged: AFTER_HOURS,
      },
    ];
    service.evaluateAll(AFTER_HOURS);
    expect(service.countActive()).toBe(1);
  });
});
