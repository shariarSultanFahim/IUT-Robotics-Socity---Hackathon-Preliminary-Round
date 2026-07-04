import { formatDhakaDateTime, formatDhakaTime } from './discord-time.util';

describe('Discord timestamp formatting (Asia/Dhaka, UTC+6)', () => {
  // 2026-07-03T16:30:00Z == 03 Jul 2026, 22:30 in Dhaka == 10:30 PM
  const utc = '2026-07-03T16:30:00.000Z';

  it('formats a full date-time as `03 Jul 2026, 10:30 PM`', () => {
    expect(formatDhakaDateTime(utc)).toBe('03 Jul 2026, 10:30 PM');
  });

  it('formats time-only as `10:30 PM`', () => {
    expect(formatDhakaTime(utc)).toBe('10:30 PM');
  });

  it('uses uppercase AM for morning times', () => {
    // 03:15Z == 09:15 Dhaka
    expect(formatDhakaTime('2026-07-03T03:15:00Z')).toBe('09:15 AM');
    expect(formatDhakaDateTime('2026-07-03T03:15:00Z')).toBe(
      '03 Jul 2026, 09:15 AM',
    );
  });

  it('accepts a Date instance', () => {
    expect(formatDhakaDateTime(new Date(utc))).toBe('03 Jul 2026, 10:30 PM');
  });

  it('rolls the date across the timezone boundary', () => {
    // 2026-07-03T19:00:00Z == 04 Jul 2026, 01:00 AM in Dhaka
    expect(formatDhakaDateTime('2026-07-03T19:00:00Z')).toBe(
      '04 Jul 2026, 01:00 AM',
    );
  });

  it('falls back to the raw value for an unparseable input', () => {
    expect(formatDhakaDateTime('not-a-date')).toBe('not-a-date');
  });

  it('does not add a manual 6-hour offset (midnight UTC → 6 AM Dhaka)', () => {
    expect(formatDhakaTime('2026-07-03T00:00:00Z')).toBe('06:00 AM');
  });
});
