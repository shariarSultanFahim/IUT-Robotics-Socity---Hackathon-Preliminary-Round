import { AlertView } from '../alerts/alerts.types';
import { OfficeSummary, RoomSummary } from '../devices/devices.types';
import { ROOM_DISPLAY_NAME, ROOM_IDS } from '../common/devices.constants';
import { UsageSnapshot } from '../usage/usage.types';
import { formatDhakaDateTime } from './discord-time.util';

const DEFAULT_TIMEZONE = 'Asia/Dhaka';

/** count + correctly pluralised noun, e.g. 1 fan / 2 fans / 0 fans. */
export function pluralize(count: number, singular: string): string {
  const noun = count === 1 ? singular : `${singular}s`;
  return `${count} ${noun}`;
}

export function formatStatus(summary: OfficeSummary): string {
  const lines: string[] = ['🏢 **Office Status**', ''];
  for (const room of summary.rooms) {
    lines.push(
      `• **${room.displayName}** — ${pluralize(
        room.activeFans,
        'fan',
      )} and ${pluralize(room.activeLights, 'light')} on (${room.watts} W)`,
    );
  }
  lines.push('');
  lines.push(
    `Active now: ${pluralize(summary.activeFans, 'fan')} and ${pluralize(
      summary.activeLights,
      'light',
    )}.`,
  );
  lines.push(`Total office power: **${summary.totalWatts} W**.`);
  return lines.join('\n');
}

export function formatRoom(
  room: RoomSummary,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const lines: string[] = [`🚪 **${room.displayName}**`, ''];
  for (const device of room.devices) {
    const icon = device.status === 'on' ? '🟢' : '⚪';
    const typeLabel = device.type === 'fan' ? 'Fan' : 'Light';
    lines.push(
      `${icon} ${device.label} (${typeLabel}) — ${device.status.toUpperCase()}`,
    );
  }
  lines.push('');
  lines.push(
    `${pluralize(room.activeFans, 'fan')} and ${pluralize(
      room.activeLights,
      'light',
    )} currently on.`,
  );
  lines.push(`Room power: **${room.watts} W**.`);
  if (room.lastChange) {
    lines.push(
      `Latest change: ${formatDhakaDateTime(room.lastChange, timeZone)}.`,
    );
  } else {
    lines.push('No changes recorded yet.');
  }
  return lines.join('\n');
}

export function formatAlerts(
  alerts: AlertView[],
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  if (alerts.length === 0) {
    return '✅ All clear — there are no active alerts right now.';
  }
  const lines: string[] = [
    `🚨 **${pluralize(alerts.length, 'active alert')}**`,
    '',
  ];
  for (const alert of alerts) {
    lines.push(
      `• ${alert.message} (since ${formatDhakaDateTime(alert.triggeredAt, timeZone)})`,
    );
  }
  return lines.join('\n');
}

function alertLocation(alert: AlertView): string {
  return alert.room
    ? ROOM_DISPLAY_NAME[alert.room]
    : alert.deviceId
      ? `device ${alert.deviceId}`
      : 'the office';
}

export function formatProactiveAlert(
  alert: AlertView,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return [
    '🚨 **New Alert**',
    alert.message,
    `Location: ${alertLocation(alert)}`,
    `Triggered at: ${formatDhakaDateTime(alert.triggeredAt, timeZone)}`,
  ].join('\n');
}

export function formatResolvedAlert(
  alert: AlertView,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const when = alert.resolvedAt ?? new Date().toISOString();
  return [
    '✅ **Alert Resolved**',
    alert.message,
    `Location: ${alertLocation(alert)}`,
    `Resolved at: ${formatDhakaDateTime(when, timeZone)}`,
  ].join('\n');
}

export function formatUsage(
  usage: UsageSnapshot,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const lines: string[] = [
    '⚡ **Office Power Usage**',
    '',
    `Current power: **${usage.currentWatts} W**`,
    `Today's estimated usage: **${usage.todayKwh.toFixed(2)} kWh**`,
    '',
  ];
  for (const room of ROOM_IDS) {
    lines.push(`• ${ROOM_DISPLAY_NAME[room]}: ${usage.roomBreakdown[room]} W`);
  }
  lines.push('');
  lines.push(`Updated: ${formatDhakaDateTime(usage.calculatedAt, timeZone)}`);
  return lines.join('\n');
}

export function formatUnknownRoom(input: string): string {
  return (
    `Sorry, I don't recognise the room "${input}". ` +
    'Try: `drawing`, `work1`, or `work2` ' +
    '(also accepts "drawing room", "work room 1", "work room 2").'
  );
}

export function helpText(prefix: string): string {
  return [
    '🤖 **Office Monitor commands**',
    `${prefix}status — status of all rooms`,
    `${prefix}room <name> — details for one room`,
    `${prefix}usage — current power draw and today's kWh`,
    `${prefix}alerts — active alerts`,
    `${prefix}help — list all available commands and what they do`,
  ].join('\n');
}
