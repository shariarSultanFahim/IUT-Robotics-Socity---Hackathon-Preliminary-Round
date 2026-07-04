import { ConfigService } from '@nestjs/config';
import { DiscordCommandService } from './discord-command.service';
import { DevicesService } from '../devices/devices.service';
import { AlertsService } from '../alerts/alerts.service';
import { UsageService } from '../usage/usage.service';
import { OfficeSummary, RoomSummary } from '../devices/devices.types';
import { UsageSnapshot } from '../usage/usage.types';
import { pluralize } from './discord.formatter';

const officeSummary: OfficeSummary = {
  totalDevices: 15,
  activeFans: 1,
  activeLights: 2,
  totalWatts: 90,
  rooms: [
    {
      room: 'drawing',
      displayName: 'Drawing Room',
      devices: [],
      activeFans: 1,
      activeLights: 1,
      totalFans: 2,
      totalLights: 3,
      watts: 75,
      lastChange: null,
    },
    {
      room: 'work1',
      displayName: 'Work Room 1',
      devices: [],
      activeFans: 0,
      activeLights: 1,
      totalFans: 2,
      totalLights: 3,
      watts: 15,
      lastChange: null,
    },
    {
      room: 'work2',
      displayName: 'Work Room 2',
      devices: [],
      activeFans: 0,
      activeLights: 0,
      totalFans: 2,
      totalLights: 3,
      watts: 0,
      lastChange: null,
    },
  ],
};

const drawingRoom: RoomSummary = {
  room: 'drawing',
  displayName: 'Drawing Room',
  devices: [
    {
      id: 'drawing-fan-1',
      type: 'fan',
      room: 'drawing',
      label: 'Fan 1',
      status: 'on',
      wattage: 60,
      lastChanged: '2026-07-03T10:00:00.000Z',
    },
    {
      id: 'drawing-light-1',
      type: 'light',
      room: 'drawing',
      label: 'Light 1',
      status: 'off',
      wattage: 15,
      lastChanged: '2026-07-03T09:00:00.000Z',
    },
  ],
  activeFans: 1,
  activeLights: 0,
  totalFans: 2,
  totalLights: 3,
  watts: 60,
  lastChange: '2026-07-03T10:00:00.000Z',
};

const usageSnapshot: UsageSnapshot = {
  currentWatts: 90,
  todayKwh: 4.2,
  roomBreakdown: { drawing: 75, work1: 15, work2: 0 },
  calculatedAt: '2026-07-03T16:30:00.000Z',
};

function build(prefix = '!') {
  const config = {
    get: (key: string, def?: unknown) => {
      if (key === 'DISCORD_COMMAND_PREFIX') return prefix;
      if (key === 'OFFICE_TIMEZONE') return 'Asia/Dhaka';
      return def;
    },
  } as unknown as ConfigService;
  const devices = {
    getOfficeSummary: jest.fn().mockResolvedValue(officeSummary),
    getRoomSummary: jest.fn().mockResolvedValue(drawingRoom),
  } as unknown as DevicesService;
  const alerts = {
    getActiveAlerts: jest.fn().mockResolvedValue([]),
  } as unknown as AlertsService;
  const usage = {
    getUsageSnapshot: jest.fn().mockReturnValue(usageSnapshot),
  } as unknown as UsageService;
  const service = new DiscordCommandService(config, devices, alerts, usage);
  return { service, devices, alerts, usage };
}

describe('pluralize', () => {
  it('uses singular for 1 and plural otherwise', () => {
    expect(pluralize(0, 'fan')).toBe('0 fans');
    expect(pluralize(1, 'fan')).toBe('1 fan');
    expect(pluralize(2, 'light')).toBe('2 lights');
  });
});

describe('DiscordCommandService', () => {
  it('ignores non-command messages', async () => {
    const { service } = build();
    expect(await service.handleCommand('hello there')).toBeNull();
    expect(await service.handleCommand('')).toBeNull();
  });

  it('answers !status from live services (case-insensitive)', async () => {
    const { service, devices } = build();
    const reply = await service.handleCommand('!STATUS');
    expect(devices.getOfficeSummary).toHaveBeenCalled();
    expect(reply).toContain('Drawing Room');
    expect(reply).toContain('90 W');
    // grammar: 1 fan (singular)
    expect(reply).toContain('1 fan');
  });

  it('answers !room with a known alias', async () => {
    const { service, devices } = build();
    const reply = await service.handleCommand('!room drawing room');
    expect(devices.getRoomSummary).toHaveBeenCalledWith('drawing');
    expect(reply).toContain('Drawing Room');
    expect(reply).toContain('Fan 1');
    expect(reply).toContain('60 W');
    // Latest change rendered in Asia/Dhaka 12-hour format
    // (2026-07-03T10:00:00Z -> 04:00 PM Dhaka), never the raw ISO string.
    expect(reply).toContain('03 Jul 2026, 04:00 PM');
    expect(reply).not.toContain('2026-07-03T10:00:00.000Z');
  });

  it('guides the user on an unknown room', async () => {
    const { service, devices } = build();
    const reply = await service.handleCommand('!room kitchen');
    expect(devices.getRoomSummary).not.toHaveBeenCalled();
    expect(reply).toContain("don't recognise");
    expect(reply).toContain('drawing');
  });

  it('guides the user when no room name is given', async () => {
    const { service } = build();
    const reply = await service.handleCommand('!room');
    expect(reply).toContain("don't recognise");
  });

  it('answers !help with a list of available commands', async () => {
    const { service } = build();
    const reply = await service.handleCommand('!help');
    expect(reply).toContain('Office Monitor commands');
    expect(reply).toContain('!status');
    expect(reply).toContain('!room');
    expect(reply).toContain('!usage');
    expect(reply).toContain('!alerts');
    expect(reply).toContain('!help');
  });

  it('answers !usage from the usage service (case-insensitive)', async () => {
    const { service, usage } = build();
    const reply = await service.handleCommand('!USAGE');
    expect(usage.getUsageSnapshot).toHaveBeenCalled();
    // current watts
    expect(reply).toContain('Current power: **90 W**');
    // kWh rendered to exactly 2 decimals
    expect(reply).toContain("Today's estimated usage: **4.20 kWh**");
    // room-wise power with human-readable names
    expect(reply).toContain('Drawing Room: 75 W');
    expect(reply).toContain('Work Room 1: 15 W');
    // zero usage handled correctly
    expect(reply).toContain('Work Room 2: 0 W');
    // 12-hour Asia/Dhaka timestamp, never raw ISO / JSON
    expect(reply).toContain('03 Jul 2026, 10:30 PM');
    expect(reply).not.toContain('2026-07-03T16:30:00.000Z');
    expect(reply).not.toContain('{');
  });

  it('answers !usage with a custom command prefix', async () => {
    const { service, usage } = build('$');
    expect(await service.handleCommand('!usage')).toBeNull();
    const reply = await service.handleCommand('$usage');
    expect(usage.getUsageSnapshot).toHaveBeenCalled();
    expect(reply).toContain('Office Power Usage');
  });

  it('answers !alerts with an all-clear message when none active', async () => {
    const { service } = build();
    const reply = await service.handleCommand('!alerts');
    expect(reply).toContain('All clear');
  });

  it('lists active alerts', async () => {
    const { service, alerts } = build();
    (alerts.getActiveAlerts as jest.Mock).mockResolvedValue([
      {
        id: 'a1',
        type: 'AFTER_HOURS',
        room: 'drawing',
        deviceId: 'drawing-fan-1',
        message: 'Fan 1 in Drawing Room is ON outside office hours.',
        triggeredAt: '2026-07-03T20:00:00.000Z',
        resolvedAt: null,
        active: true,
      },
    ]);
    const reply = await service.handleCommand('!alerts');
    expect(reply).toContain('1 active alert');
    expect(reply).toContain('outside office hours');
  });

  it('respects a custom command prefix', async () => {
    const { service } = build('$');
    expect(await service.handleCommand('!status')).toBeNull();
    expect(await service.handleCommand('$status')).toContain('Office Status');
  });

  it('returns help for an unknown command', async () => {
    const { service } = build();
    const reply = await service.handleCommand('!wat');
    expect(reply).toContain('Unknown command');
  });
});
