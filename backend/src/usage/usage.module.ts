import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  providers: [UsageService],
  controllers: [UsageController],
  exports: [UsageService],
})
export class UsageModule {}
