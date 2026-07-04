import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { ClockService } from '../common/clock.service';
import { DevicesService } from '../devices/devices.service';
import { DOMAIN_EVENTS } from '../common/events';
import { ROOM_DISPLAY_NAME } from '../common/devices.constants';
import { DeviceRecord } from '../devices/devices.types';
import {
  ActiveAlert,
  AlertTypeId,
  AlertView,
  toAlertView,
} from './alerts.types';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

interface DesiredCondition {
  dedupeKey: string;
  type: AlertTypeId;
  room: DeviceRecord['room'] | null;
  deviceId: string | null;
  message: string;
}

/**
 * In-memory active alerts (not persisted). Only currently-active alerts are
 * held, keyed by a stable dedupe key. Rules are unchanged:
 *   1. A device is ON outside office hours.
 *   2. All 5 devices in a room have been ON continuously for > 2 hours.
 * Condition true -> add one alert; still true -> nothing; resolved -> remove.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly active = new Map<string, ActiveAlert>();
  private evaluating = false;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly clock: ClockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getActiveAlerts(): AlertView[] {
    return [...this.active.values()]
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .map((a) => toAlertView(a, { active: true }));
  }

  countActive(): number {
    return this.active.size;
  }

  /** Re-evaluate after every device change. */
  @OnEvent(DOMAIN_EVENTS.DEVICE_UPDATED)
  onDeviceUpdated(): void {
    this.evaluateAll();
  }

  /** Reconcile active alerts against current in-memory device state. */
  evaluateAll(reference: Date = this.clock.now()): void {
    if (this.evaluating) return;
    this.evaluating = true;
    try {
      const devices = this.devicesService.snapshotRecords();
      const desired = this.computeDesiredConditions(devices, reference);
      const desiredKeys = new Set(desired.map((d) => d.dedupeKey));

      // Trigger newly-satisfied conditions.
      for (const condition of desired) {
        if (!this.active.has(condition.dedupeKey)) {
          this.trigger(condition);
        }
      }

      // Resolve conditions that no longer hold.
      for (const [key, alert] of [...this.active.entries()]) {
        if (!desiredKeys.has(key)) {
          this.resolve(alert, reference);
        }
      }
    } catch (error) {
      this.logger.error(
        `Alert evaluation failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    } finally {
      this.evaluating = false;
    }
  }

  private computeDesiredConditions(
    devices: DeviceRecord[],
    reference: Date,
  ): DesiredCondition[] {
    const conditions: DesiredCondition[] = [];
    const withinHours = this.clock.isWithinOfficeHours(reference);
    const threshold = reference.getTime() - TWO_HOURS_MS;

    // Rule 1: any device ON outside office hours.
    if (!withinHours) {
      for (const device of devices) {
        if (device.status === 'on') {
          conditions.push({
            dedupeKey: `after-hours:${device.id}`,
            type: 'AFTER_HOURS',
            room: device.room,
            deviceId: device.id,
            message: `${device.label} in ${
              ROOM_DISPLAY_NAME[device.room]
            } is ON outside office hours (${this.hoursLabel()}).`,
          });
        }
      }
    }

    // Rule 2: all 5 devices in a room ON continuously for > 2 hours.
    for (const room of ['drawing', 'work1', 'work2'] as const) {
      const roomDevices = devices.filter((d) => d.room === room);
      if (roomDevices.length === 0) continue;
      const allOn = roomDevices.every((d) => d.status === 'on');
      const allBeyondThreshold = roomDevices.every(
        (d) => d.lastChanged.getTime() < threshold,
      );
      if (allOn && allBeyondThreshold) {
        conditions.push({
          dedupeKey: `all-on-too-long:${room}`,
          type: 'ALL_DEVICES_ON_TOO_LONG',
          room,
          deviceId: null,
          message: `All devices in ${ROOM_DISPLAY_NAME[room]} have been ON for more than 2 hours.`,
        });
      }
    }

    return conditions;
  }

  private hoursLabel(): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(this.clock.startHour)}:00–${pad(this.clock.endHour)}:00`;
  }

  private trigger(condition: DesiredCondition): void {
    const alert: ActiveAlert = {
      id: randomUUID(),
      dedupeKey: condition.dedupeKey,
      type: condition.type,
      room: condition.room,
      deviceId: condition.deviceId,
      message: condition.message,
      triggeredAt: this.clock.now(),
    };
    this.active.set(condition.dedupeKey, alert);
    this.eventEmitter.emit(DOMAIN_EVENTS.ALERT_TRIGGERED, {
      alert: toAlertView(alert, { active: true }),
    });
    this.logger.log(`Alert triggered: ${condition.dedupeKey}`);
  }

  private resolve(alert: ActiveAlert, reference: Date): void {
    this.active.delete(alert.dedupeKey);
    this.eventEmitter.emit(DOMAIN_EVENTS.ALERT_RESOLVED, {
      alert: toAlertView(alert, { active: false, resolvedAt: reference }),
    });
    this.logger.log(`Alert resolved: ${alert.dedupeKey}`);
  }
}
