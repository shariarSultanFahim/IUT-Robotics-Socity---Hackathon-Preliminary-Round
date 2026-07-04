import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './devices/devices.module';
import { UsageModule } from './usage/usage.module';
import { AlertsModule } from './alerts/alerts.module';
import { OfficeHoursModule } from './office-hours/office-hours.module';
import { SimulatorModule } from './simulator/simulator.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DiscordModule } from './discord/discord.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    DatabaseModule,
    AuthModule,
    DevicesModule,
    UsageModule,
    AlertsModule,
    OfficeHoursModule,
    SimulatorModule,
    RealtimeModule,
    DiscordModule,
    HealthModule,
  ],
})
export class AppModule {}
