import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OfficeHoursService } from './office-hours.service';
import { ClockService } from '../common/clock.service';
import { AlertsService } from '../alerts/alerts.service';
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

describe('OfficeHoursService', () => {
  let clock: ClockService;
  let alerts: { evaluateAll: jest.Mock };
  let emitter: { emit: jest.Mock };
  let service: OfficeHoursService;

  beforeEach(() => {
    clock = makeClock();
    alerts = { evaluateAll: jest.fn() };
    emitter = { emit: jest.fn() };
    service = new OfficeHoursService(
      clock,
      alerts as unknown as AlertsService,
      emitter as unknown as EventEmitter2,
    );
  });

  it('reports the current state (defaults to auto)', () => {
    const state = service.getState();
    expect(state).toMatchObject({
      mode: 'auto',
      startHour: 9,
      endHour: 17,
      timezone: 'Asia/Dhaka',
    });
    expect(typeof state.withinOfficeHours).toBe('boolean');
  });

  it('setMode updates the clock, re-evaluates alerts and emits an event', () => {
    const state = service.setMode('closed');
    expect(clock.getOfficeMode()).toBe('closed');
    expect(state.mode).toBe('closed');
    expect(state.withinOfficeHours).toBe(false); // forced after-hours
    expect(alerts.evaluateAll).toHaveBeenCalledTimes(1);
    expect(emitter.emit).toHaveBeenCalledWith(
      DOMAIN_EVENTS.OFFICE_HOURS_UPDATED,
      { state },
    );
  });

  it("'open' forces withinOfficeHours true", () => {
    expect(service.setMode('open').withinOfficeHours).toBe(true);
  });
});
