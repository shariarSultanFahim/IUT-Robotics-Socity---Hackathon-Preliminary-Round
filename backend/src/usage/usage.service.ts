import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ClockService } from '../common/clock.service';
import { DevicesService } from '../devices/devices.service';
import { calculatePowerTotals, toRoomBreakdown } from '../common/power';
import { DOMAIN_EVENTS } from '../common/events';
import { RoomBreakdown, UsageSnapshot } from './usage.types';

/** How often the accumulator folds in elapsed energy (lightweight tick). */
const ENERGY_TICK_MS = 30_000;
const TICK_NAME = 'usage-energy-tick';

/**
 * In-memory usage. Current watts and room breakdown are computed directly from
 * the in-memory devices. Today's kWh is accumulated over actual elapsed time:
 *
 *   energyKwh += wattsInEffect × elapsedHours / 1000
 *
 * The accumulator is advanced on a lightweight scheduled tick AND whenever a
 * device changes (the pre-change interval is attributed to the previous total,
 * so nothing is double-counted). It resets at local midnight in OFFICE_TIMEZONE.
 * The estimate is NOT persisted and resets when the backend restarts.
 */
@Injectable()
export class UsageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UsageService.name);

  private energyKwh = 0;
  private lastTickAt: Date;
  /** Watts that have been in effect since `lastTickAt`. */
  private lastWatts = 0;
  /** Office-day key (yyyy-mm-dd in office tz) the accumulator belongs to. */
  private dayKey: string;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly clock: ClockService,
    private readonly eventEmitter: EventEmitter2,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    const now = this.clock.now();
    this.lastTickAt = now;
    this.dayKey = this.officeDayKey(now);
  }

  onModuleInit(): void {
    const handle = setInterval(() => this.accumulate(), ENERGY_TICK_MS);
    this.schedulerRegistry.addInterval(TICK_NAME, handle);
  }

  onModuleDestroy(): void {
    if (this.schedulerRegistry.doesExist('interval', TICK_NAME)) {
      this.schedulerRegistry.deleteInterval(TICK_NAME);
    }
  }

  getCurrentWatts(): number {
    return calculatePowerTotals(this.devicesService.snapshotRecords())
      .totalWatts;
  }

  getRoomBreakdown(): RoomBreakdown {
    return toRoomBreakdown(
      calculatePowerTotals(this.devicesService.snapshotRecords()),
    );
  }

  getTodayKwh(reference: Date = this.clock.now()): number {
    this.accumulate(reference);
    return Math.round(this.energyKwh * 10000) / 10000;
  }

  getUsageSnapshot(reference: Date = this.clock.now()): UsageSnapshot {
    const totals = calculatePowerTotals(this.devicesService.snapshotRecords());
    const todayKwh = this.getTodayKwh(reference);
    return {
      currentWatts: totals.totalWatts,
      todayKwh,
      roomBreakdown: toRoomBreakdown(totals),
      calculatedAt: reference.toISOString(),
    };
  }

  /**
   * Fold elapsed energy into the accumulator using the watts that were in
   * effect since the last accumulation, then refresh the "in effect" watts to
   * the current total. Resets at the local-midnight day boundary.
   */
  accumulate(reference: Date = this.clock.now()): void {
    const currentWatts = calculatePowerTotals(
      this.devicesService.snapshotRecords(),
    ).totalWatts;

    const today = this.officeDayKey(reference);
    if (today !== this.dayKey) {
      // New office day — reset the daily estimate (in-memory only).
      this.energyKwh = 0;
      this.dayKey = today;
      this.lastTickAt = reference;
      this.lastWatts = currentWatts;
      return;
    }

    const elapsedMs = reference.getTime() - this.lastTickAt.getTime();
    if (elapsedMs > 0) {
      const elapsedHours = elapsedMs / 3_600_000;
      this.energyKwh += (this.lastWatts * elapsedHours) / 1000;
    }
    this.lastTickAt = reference;
    this.lastWatts = currentWatts;
  }

  /** Recompute + emit usage after any committed device change. */
  @OnEvent(DOMAIN_EVENTS.DEVICE_UPDATED)
  onDeviceUpdated(): void {
    try {
      const usage = this.getUsageSnapshot();
      this.eventEmitter.emit(DOMAIN_EVENTS.USAGE_UPDATED, { usage });
    } catch (error) {
      this.logger.warn(
        `Failed to emit usage update: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private officeDayKey(reference: Date): string {
    return this.clock.getOfficeMidnight(reference).toISOString();
  }
}
