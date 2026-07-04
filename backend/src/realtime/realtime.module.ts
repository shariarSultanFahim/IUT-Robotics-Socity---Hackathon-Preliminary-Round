import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { DevicesModule } from '../devices/devices.module';
import { UsageModule } from '../usage/usage.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DevicesModule, UsageModule, AlertsModule, AuthModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
