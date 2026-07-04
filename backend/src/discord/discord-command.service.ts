import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from '../devices/devices.service';
import { AlertsService } from '../alerts/alerts.service';
import { UsageService } from '../usage/usage.service';
import { CONFIG_KEYS } from '../config/configuration';
import { resolveRoomAlias } from '../common/devices.constants';
import {
  formatAlerts,
  formatRoom,
  formatStatus,
  formatUnknownRoom,
  formatUsage,
  helpText,
} from './discord.formatter';

/**
 * Parses and answers text commands using database-backed services only.
 * Pure with respect to Discord (no client dependency), so it is unit-testable.
 */
@Injectable()
export class DiscordCommandService {
  private readonly logger = new Logger(DiscordCommandService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly devicesService: DevicesService,
    private readonly alertsService: AlertsService,
    private readonly usageService: UsageService,
  ) {}

  get prefix(): string {
    return this.config.get<string>(CONFIG_KEYS.DISCORD_COMMAND_PREFIX, '!');
  }

  get timeZone(): string {
    return this.config.get<string>(CONFIG_KEYS.OFFICE_TIMEZONE, 'Asia/Dhaka');
  }

  /**
   * Returns a reply string, or null if the message is not a command for us.
   * Never throws — errors are turned into a friendly message.
   */
  async handleCommand(content: string): Promise<string | null> {
    const prefix = this.prefix;
    const trimmed = content.trim();
    if (!trimmed.startsWith(prefix)) {
      return null;
    }

    const body = trimmed.slice(prefix.length).trim();
    if (body.length === 0) {
      return helpText(prefix);
    }

    const [rawCommand, ...rest] = body.split(/\s+/);
    const command = rawCommand.toLowerCase();
    const args = rest.join(' ');

    try {
      switch (command) {
        case 'status':
          return formatStatus(await this.devicesService.getOfficeSummary());

        case 'room': {
          if (!args) {
            return formatUnknownRoom('');
          }
          const room = resolveRoomAlias(args);
          if (!room) {
            return formatUnknownRoom(args);
          }
          return formatRoom(
            await this.devicesService.getRoomSummary(room),
            this.timeZone,
          );
        }

        case 'usage':
          return formatUsage(
            this.usageService.getUsageSnapshot(),
            this.timeZone,
          );

        case 'alerts':
          return formatAlerts(
            await this.alertsService.getActiveAlerts(),
            this.timeZone,
          );

        case 'help':
          return helpText(prefix);

        default:
          return `Unknown command \`${command}\`.\n${helpText(prefix)}`;
      }
    } catch (error) {
      this.logger.error(
        `Command '${command}' failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return 'Sorry, something went wrong while fetching that data. Please try again.';
    }
  }
}
