import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DevicesService } from '../devices/devices.service';
import { DEVICE_IDS } from '../common/devices.constants';
import { CONFIG_KEYS } from '../config/configuration';

const INTERVAL_NAME = 'device-simulator';

/**
 * Randomly toggles one of the 15 fixed devices on an interval. It calls
 * DevicesService.toggleStatus so it uses the exact same committed,
 * transactional flow as manual changes — no second device-state store.
 */
@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private running = false;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const enabled = this.config.get<boolean>(
      CONFIG_KEYS.SIMULATOR_ENABLED,
      true,
    );
    if (!enabled) {
      this.logger.log('Simulator disabled (SIMULATOR_ENABLED=false)');
      return;
    }
    const intervalMs = this.config.get<number>(
      CONFIG_KEYS.SIMULATOR_INTERVAL_MS,
      10000,
    );
    const handle = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.schedulerRegistry.addInterval(INTERVAL_NAME, handle);
    this.logger.log(`Simulator started (every ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.schedulerRegistry.doesExist('interval', INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(INTERVAL_NAME);
    }
  }

  async tick(): Promise<void> {
    if (this.running) {
      this.logger.debug('Skipping tick: previous simulation still running');
      return;
    }
    this.running = true;
    try {
      const id = DEVICE_IDS[Math.floor(Math.random() * DEVICE_IDS.length)];
      const updated = await this.devicesService.toggleStatus(id, 'simulator');
      this.logger.debug(`Simulator toggled ${id} -> ${updated.status}`);
    } catch (error) {
      // Simulator errors must never crash the app.
      this.logger.error(
        `Simulator tick failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    } finally {
      this.running = false;
    }
  }
}
