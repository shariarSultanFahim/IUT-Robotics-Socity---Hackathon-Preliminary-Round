/**
 * One reusable formatter. API timestamps are UTC ISO strings; the UI shows them
 * in Bangladesh time (Asia/Dhaka, en-BD, 12-hour, uppercase AM/PM). We never add
 * a manual 6-hour offset — Intl handles the timezone.
 */
const TIMEZONE = 'Asia/Dhaka';

function parts(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const dtf = new Intl.DateTimeFormat('en-BD', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return map;
}

/** e.g. `03 Jul 2026, 10:30 PM`. */
export function formatDateTime(value: string | Date): string {
  const p = parts(value);
  if (!p) return String(value);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${(p.dayPeriod ?? '').toUpperCase()}`;
}

/** e.g. `10:30 PM`. */
export function formatTime(value: string | Date): string {
  const p = parts(value);
  if (!p) return String(value);
  return `${p.hour}:${p.minute} ${(p.dayPeriod ?? '').toUpperCase()}`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
