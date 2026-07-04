import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, DeviceUpdatedEvent } from '../common/events';
import { calculatePowerTotals } from '../common/power';
import {
  ChangeSourceId,
  DEVICE_SEEDS,
  DEVICE_STATUSES,
  DeviceStatusId,
  DeviceTypeId,
  ROOM_DISPLAY_NAME,
  ROOM_IDS,
  RoomId,
} from '../common/devices.constants';
import {
  DeviceRecord,
  DeviceView,
  OfficeSummary,
  RoomSummary,
  toDeviceView,
} from './devices.types';

export type { ChangeSourceId } from '../common/devices.constants';

/**
 * In-memory device state — the single source of truth for REST, Socket.IO,
 * UsageService, AlertsService, the Discord bot and the simulator.
 *
 * The 15 fixed devices are seeded into a Map on startup. State is NOT persisted:
 * it resets when the backend restarts, which is expected for simulated hackathon
 * data. No other module keeps its own copy of device state.
 */
@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);
  private readonly devices = new Map<string, DeviceRecord>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit(): void {
    this.seed();
  }

  /** Seed exactly the 15 fixed devices (all OFF). Idempotent. */
  private seed(): void {
    const now = new Date();
    this.devices.clear();
    for (const seed of DEVICE_SEEDS) {
      this.devices.set(seed.id, {
        id: seed.id,
        type: seed.type,
        room: seed.room,
        label: seed.label,
        status: 'off',
        wattage: seed.wattage,
        lastChanged: now,
      });
    }
    this.logger.log(`Seeded ${this.devices.size} in-memory devices (all OFF)`);
  }

  /** Live records (for UsageService / AlertsService). Copies avoid mutation. */
  snapshotRecords(): DeviceRecord[] {
    return [...this.devices.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((d) => ({ ...d }));
  }

  getAll(): DeviceView[] {
    return this.snapshotRecords().map(toDeviceView);
  }

  getByRoom(room: RoomId): DeviceView[] {
    this.assertRoom(room);
    return this.snapshotRecords()
      .filter((d) => d.room === room)
      .map(toDeviceView);
  }

  getById(id: string): DeviceView {
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device '${id}' not found`);
    }
    return toDeviceView(device);
  }

  /**
   * Change a device status. Returns without mutation (and emits nothing) when
   * the status is unchanged. On a real change it updates `lastChanged` and emits
   * `device.updated` (UsageService and AlertsService react to that event).
   */
  setStatus(
    id: string,
    statusId: DeviceStatusId,
    source: ChangeSourceId,
  ): DeviceView {
    if (!DEVICE_STATUSES.includes(statusId)) {
      throw new BadRequestException(`Invalid status '${statusId}'`);
    }
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device '${id}' not found`);
    }

    // Unchanged status -> no mutation, no lastChanged update, no event.
    if (device.status === statusId) {
      return toDeviceView(device);
    }

    const previousStatus = device.status;
    device.status = statusId;
    device.lastChanged = new Date();

    const view = toDeviceView(device);
    const event: DeviceUpdatedEvent = {
      device: view,
      previousStatus,
      source,
    };
    this.eventEmitter.emit(DOMAIN_EVENTS.DEVICE_UPDATED, event);
    return view;
  }

  toggleStatus(id: string, source: ChangeSourceId): DeviceView {
    const device = this.devices.get(id);
    if (!device) {
      throw new NotFoundException(`Device '${id}' not found`);
    }
    return this.setStatus(id, device.status === 'on' ? 'off' : 'on', source);
  }

  getRoomSummary(room: RoomId): RoomSummary {
    this.assertRoom(room);
    return this.buildRoomSummary(
      room,
      this.snapshotRecords().filter((d) => d.room === room),
    );
  }

  getOfficeSummary(): OfficeSummary {
    const devices = this.snapshotRecords();
    const rooms = ROOM_IDS.map((room) =>
      this.buildRoomSummary(
        room,
        devices.filter((d) => d.room === room),
      ),
    );
    const totals = calculatePowerTotals(devices);
    return {
      totalDevices: devices.length,
      activeFans: this.countActive(devices, 'fan'),
      activeLights: this.countActive(devices, 'light'),
      totalWatts: totals.totalWatts,
      rooms,
    };
  }

  private buildRoomSummary(room: RoomId, devices: DeviceRecord[]): RoomSummary {
    const totals = calculatePowerTotals(devices);
    const watts =
      room === 'drawing'
        ? totals.drawingWatts
        : room === 'work1'
          ? totals.work1Watts
          : totals.work2Watts;
    const lastChange = devices.reduce<Date | null>((latest, d) => {
      if (!latest || d.lastChanged > latest) return d.lastChanged;
      return latest;
    }, null);
    return {
      room,
      displayName: ROOM_DISPLAY_NAME[room],
      devices: devices.map(toDeviceView),
      activeFans: this.countActive(devices, 'fan'),
      activeLights: this.countActive(devices, 'light'),
      totalFans: devices.filter((d) => d.type === 'fan').length,
      totalLights: devices.filter((d) => d.type === 'light').length,
      watts,
      lastChange: lastChange ? lastChange.toISOString() : null,
    };
  }

  private countActive(devices: DeviceRecord[], type: DeviceTypeId): number {
    return devices.filter((d) => d.type === type && d.status === 'on').length;
  }

  private assertRoom(room: string): asserts room is RoomId {
    if (!ROOM_IDS.includes(room as RoomId)) {
      throw new BadRequestException(
        `Invalid room '${room}'. Valid rooms: ${ROOM_IDS.join(', ')}`,
      );
    }
  }
}
