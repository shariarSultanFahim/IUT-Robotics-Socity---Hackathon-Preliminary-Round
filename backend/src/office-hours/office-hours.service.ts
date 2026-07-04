import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClockService, OfficeHoursMode } from '../common/clock.service';
import { AlertsService } from '../alerts/alerts.service';
import { DOMAIN_EVENTS, OfficeHoursState } from '../common/events';

/**
 * Demo control for the office-hours override. Changing the mode only affects the
 * after-hours alert rule (via ClockService.isWithinOfficeHours); it does not
 * touch real time, kWh or timestamps. Setting a mode immediately re-evaluates
 * alerts so the dashboard/Discord reflect the change right away.
 */
@Injectable()
export class OfficeHoursService {
  private readonly logger = new Logger(OfficeHoursService.name);

  constructor(
    private readonly clock: ClockService,
    private readonly alertsService: AlertsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getState(): OfficeHoursState {
    return {
      mode: this.clock.getOfficeMode(),
      withinOfficeHours: this.clock.isWithinOfficeHours(),
      startHour: this.clock.startHour,
      endHour: this.clock.endHour,
      timezone: this.clock.timezone,
    };
  }

  setMode(mode: OfficeHoursMode): OfficeHoursState {
    this.clock.setOfficeMode(mode);
    this.logger.log(`Office-hours mode set to '${mode}'`);
    // Re-evaluate immediately so alerts appear/clear without waiting for the tick.
    this.alertsService.evaluateAll();
    const state = this.getState();
    this.eventEmitter.emit(DOMAIN_EVENTS.OFFICE_HOURS_UPDATED, { state });
    return state;
  }
}
