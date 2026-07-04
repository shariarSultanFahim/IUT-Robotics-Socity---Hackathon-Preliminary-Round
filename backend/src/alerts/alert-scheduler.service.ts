import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AlertsService } from './alerts.service';
import { CONFIG_KEYS } from '../config/configuration';

const INTERVAL_NAME = 'alert-evaluation';

/** Periodically re-evaluates alerts (time-based rules must fire without a
 * device change, e.g. crossing 17:00 or a room passing the 2-hour mark). */
@Injectable()
export class AlertSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertSchedulerService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get<number>(
      CONFIG_KEYS.ALERT_EVALUATION_INTERVAL_MS,
      60000,
    );
    const handle = setInterval(() => {
      void this.alertsService.evaluateAll();
    }, intervalMs);
    this.schedulerRegistry.addInterval(INTERVAL_NAME, handle);
    this.logger.log(
      `Alert evaluation scheduler started (every ${intervalMs}ms)`,
    );
  }

  onModuleDestroy(): void {
    if (this.schedulerRegistry.doesExist('interval', INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(INTERVAL_NAME);
    }
  }
}
