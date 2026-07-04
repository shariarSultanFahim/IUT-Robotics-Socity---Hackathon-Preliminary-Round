import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordCommandService } from './discord-command.service';
import { DevicesModule } from '../devices/devices.module';
import { AlertsModule } from '../alerts/alerts.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [DevicesModule, AlertsModule, UsageModule],
  providers: [DiscordService, DiscordCommandService],
  exports: [DiscordService],
})
export class DiscordModule {}
