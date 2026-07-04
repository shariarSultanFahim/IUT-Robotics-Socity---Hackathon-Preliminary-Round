import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '../config/configuration';

/**
 * Office-hours mode:
 * - `auto`   — use the real clock + OFFICE_START_HOUR/OFFICE_END_HOUR (default).
 * - `open`   — force "within office hours" (no after-hours alerts).
 * - `closed` — force "outside office hours" (after-hours rule always active).
 *
 * The override is a demo control; it only changes `isWithinOfficeHours`, not the
 * real time used elsewhere (kWh, midnight reset, timestamps).
 */
export type OfficeHoursMode = 'auto' | 'open' | 'closed';

/**
 * Central, injectable source of "now" and all timezone-aware office-hour math.
 *
 * Tests can override `now()` (e.g. jest.spyOn) or pass an explicit reference
 * date into the helpers to make time-dependent logic deterministic.
 */
@Injectable()
export class ClockService {
  private officeMode: OfficeHoursMode = 'auto';

  constructor(private readonly config: ConfigService) {}

  now(): Date {
    return new Date();
  }

  getOfficeMode(): OfficeHoursMode {
    return this.officeMode;
  }

  setOfficeMode(mode: OfficeHoursMode): void {
    this.officeMode = mode;
  }

  get timezone(): string {
    return this.config.get<string>(CONFIG_KEYS.OFFICE_TIMEZONE, 'Asia/Dhaka');
  }

  get startHour(): number {
    return this.config.get<number>(CONFIG_KEYS.OFFICE_START_HOUR, 9);
  }

  get endHour(): number {
    return this.config.get<number>(CONFIG_KEYS.OFFICE_END_HOUR, 17);
  }

  /**
   * The offset (ms) that must be ADDED to a UTC instant to obtain the wall
   * clock in `timeZone`. For Asia/Dhaka this is +6h.
   */
  private tzOffsetMs(date: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(date);
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
    }
    const asUtc = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      map.hour === 24 ? 0 : map.hour,
      map.minute,
      map.second,
    );
    return asUtc - date.getTime();
  }

  /** Local wall-clock hour (0-23) in the office timezone for the given instant. */
  getOfficeHour(reference: Date = this.now()): number {
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hourCycle: 'h23',
      hour: '2-digit',
    }).format(reference);
    return parseInt(hour, 10) % 24;
  }

  /**
   * True when within office hours. Honors the office-hours override: `open`
   * forces true, `closed` forces false, `auto` uses startHour <= local hour <
   * endHour.
   */
  isWithinOfficeHours(reference: Date = this.now()): boolean {
    if (this.officeMode === 'open') return true;
    if (this.officeMode === 'closed') return false;
    const hour = this.getOfficeHour(reference);
    return hour >= this.startHour && hour < this.endHour;
  }

  /**
   * The UTC instant corresponding to the most recent local (office-timezone)
   * midnight at or before `reference`.
   */
  getOfficeMidnight(reference: Date = this.now()): Date {
    const tz = this.timezone;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(reference);
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
    }
    // Wall-clock midnight interpreted as UTC, then shifted by the tz offset.
    const wallMidnightAsUtc = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      0,
      0,
      0,
    );
    const offset = this.tzOffsetMs(reference, tz);
    return new Date(wallMidnightAsUtc - offset);
  }
}
