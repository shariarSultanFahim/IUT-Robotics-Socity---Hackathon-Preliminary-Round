import { Module } from '@nestjs/common';
import { OfficeHoursService } from './office-hours.service';
import { OfficeHoursController } from './office-hours.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [OfficeHoursService],
  controllers: [OfficeHoursController],
})
export class OfficeHoursModule {}
