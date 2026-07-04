import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertSchedulerService } from './alert-scheduler.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  providers: [AlertsService, AlertSchedulerService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
