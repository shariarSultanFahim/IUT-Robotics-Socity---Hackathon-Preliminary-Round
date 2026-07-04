import { ConfigService } from '@nestjs/config';
import { ClockService } from './clock.service';

function makeClock(
  tz = 'Asia/Dhaka',
  startHour = 9,
  endHour = 17,
): ClockService {
  const config = {
    get: (key: string, def?: unknown) => {
      switch (key) {
        case 'OFFICE_TIMEZONE':
          return tz;
        case 'OFFICE_START_HOUR':
          return startHour;
        case 'OFFICE_END_HOUR':
          return endHour;
        default:
          return def;
      }
    },
  } as unknown as ConfigService;
  return new ClockService(config);
}

describe('ClockService (Asia/Dhaka, UTC+6)', () => {
  const clock = makeClock();

  it('computes local office hour', () => {
    // 04:00 UTC == 10:00 Dhaka
    expect(clock.getOfficeHour(new Date('2026-07-03T04:00:00Z'))).toBe(10);
    // 12:00 UTC == 18:00 Dhaka
    expect(clock.getOfficeHour(new Date('2026-07-03T12:00:00Z'))).toBe(18);
  });

  it('detects office hours (09:00 <= h < 17:00)', () => {
    expect(clock.isWithinOfficeHours(new Date('2026-07-03T04:00:00Z'))).toBe(
      true,
    ); // 10:00
    expect(clock.isWithinOfficeHours(new Date('2026-07-03T12:00:00Z'))).toBe(
      false,
    ); // 18:00
    expect(clock.isWithinOfficeHours(new Date('2026-07-03T02:00:00Z'))).toBe(
      false,
    ); // 08:00
    expect(clock.isWithinOfficeHours(new Date('2026-07-03T11:00:00Z'))).toBe(
      false,
    ); // 17:00 (exclusive)
  });

  it('computes the UTC instant of local midnight', () => {
    // Dhaka 10:00 on Jul 3 -> local midnight is Jul 3 00:00 Dhaka == Jul 2 18:00 UTC
    const midnight = clock.getOfficeMidnight(new Date('2026-07-03T04:00:00Z'));
    expect(midnight.toISOString()).toBe('2026-07-02T18:00:00.000Z');
  });

  describe('office-hours override', () => {
    it('defaults to auto (real time-based)', () => {
      const c = makeClock();
      expect(c.getOfficeMode()).toBe('auto');
      expect(c.isWithinOfficeHours(new Date('2026-07-03T04:00:00Z'))).toBe(
        true,
      );
    });

    it("'open' forces within office hours even at 01:00 Dhaka", () => {
      const c = makeClock();
      c.setOfficeMode('open');
      // 19:00Z == 01:00 Dhaka (normally after hours) -> forced true
      expect(c.isWithinOfficeHours(new Date('2026-07-02T19:00:00Z'))).toBe(
        true,
      );
    });

    it("'closed' forces after hours even at midday", () => {
      const c = makeClock();
      c.setOfficeMode('closed');
      // 06:00Z == 12:00 Dhaka (normally within hours) -> forced false
      expect(c.isWithinOfficeHours(new Date('2026-07-02T06:00:00Z'))).toBe(
        false,
      );
    });

    it("'auto' restores the real calculation", () => {
      const c = makeClock();
      c.setOfficeMode('closed');
      c.setOfficeMode('auto');
      expect(c.isWithinOfficeHours(new Date('2026-07-03T04:00:00Z'))).toBe(
        true,
      );
    });
  });
});
