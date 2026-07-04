/**
 * Discord-visible timestamp formatting.
 *
 * The database and REST API keep timestamps as UTC ISO strings. Only messages
 * shown to Discord users are rendered in the office timezone (Asia/Dhaka) using
 * a 12-hour clock with uppercase AM/PM — e.g. `03 Jul 2026, 10:30 PM`.
 *
 * We use Intl.DateTimeFormat (locale en-BD, the configured timezone) and never
 * add a fixed 6-hour offset manually, so DST/offset changes are handled by the
 * platform.
 */
const DEFAULT_TIMEZONE = 'Asia/Dhaka';

interface TimeParts {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  dayPeriod: string;
}

function toParts(value: Date | string, timeZone: string): TimeParts | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  let dtf: Intl.DateTimeFormat;
  try {
    dtf = new Intl.DateTimeFormat('en-BD', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    // Invalid IANA timezone — fall back to the office default.
    dtf = new Intl.DateTimeFormat('en-BD', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    day: map.day ?? '',
    month: map.month ?? '',
    year: map.year ?? '',
    hour: map.hour ?? '',
    minute: map.minute ?? '',
    // Force uppercase AM/PM regardless of locale casing.
    dayPeriod: (map.dayPeriod ?? '').toUpperCase(),
  };
}

/** e.g. `03 Jul 2026, 10:30 PM`. Falls back to the raw value if unparseable. */
export function formatDhakaDateTime(
  value: Date | string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const p = toParts(value, timeZone);
  if (!p) return String(value);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** e.g. `10:30 PM`. Falls back to the raw value if unparseable. */
export function formatDhakaTime(
  value: Date | string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const p = toParts(value, timeZone);
  if (!p) return String(value);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}
