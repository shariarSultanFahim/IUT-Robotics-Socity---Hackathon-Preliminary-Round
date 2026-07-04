import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
} from 'discord.js';
import { DiscordCommandService } from './discord-command.service';
import { CONFIG_KEYS } from '../config/configuration';
import {
  AlertResolvedEvent,
  AlertTriggeredEvent,
  DOMAIN_EVENTS,
} from '../common/events';
import { formatProactiveAlert, formatResolvedAlert } from './discord.formatter';
import { Cooldown } from '../common/cooldown';
import { AlertView } from '../alerts/alerts.types';

/** Do not re-post the same alert condition to Discord more than once per 5 min. */
export const ALERT_POST_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Owns the discord.js client lifecycle inside the NestJS process.
 *
 * When DISCORD_BOT_TOKEN is missing the bot is simply not started: a warning is
 * logged, `ready` stays false, and REST/Socket.IO keep running. No Discord
 * error is ever allowed to crash the application.
 */
@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client | null = null;
  private ready = false;
  // Throttle repeated proactive posts of the same condition; only announce a
  // "resolved" for conditions we actually posted a "new alert" for.
  private readonly postCooldown = new Cooldown(ALERT_POST_COOLDOWN_MS);
  private readonly announced = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly commandService: DiscordCommandService,
  ) {}

  isReady(): boolean {
    return this.ready;
  }

  async onModuleInit(): Promise<void> {
    const token = this.config.get<string>(CONFIG_KEYS.DISCORD_BOT_TOKEN);
    if (!token) {
      this.logger.warn(
        'DISCORD_BOT_TOKEN not set — Discord bot disabled. REST and Socket.IO remain available.',
      );
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    this.client.once(Events.ClientReady, (c) => {
      this.ready = true;
      this.logger.log(`Discord bot logged in as ${c.user.tag}`);
    });

    this.client.on(Events.MessageCreate, (message) => {
      void this.onMessage(message);
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error(`Discord client error: ${error.message}`);
    });

    try {
      await this.client.login(token);
    } catch (error) {
      this.ready = false;
      this.logger.error(
        `Discord login failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }. Continuing without Discord.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.ready = false;
    }
  }

  private async onMessage(message: Message): Promise<void> {
    try {
      // Ignore bot-authored messages (including our own) to avoid loops.
      if (message.author?.bot) return;

      const reply = await this.commandService.handleCommand(message.content);
      if (reply) {
        await message.reply(reply);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle message: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private get timeZone(): string {
    return this.config.get<string>(CONFIG_KEYS.OFFICE_TIMEZONE, 'Asia/Dhaka');
  }

  /** Stable per-condition key (mirrors the alert dedupe key). */
  private alertKey(alert: AlertView): string {
    return `${alert.type}:${alert.deviceId ?? alert.room ?? 'office'}`;
  }

  /**
   * Proactive alert posting. Throttled: the same condition is posted at most
   * once every 5 minutes even if the simulator keeps re-triggering it, so the
   * channel is not spammed.
   */
  @OnEvent(DOMAIN_EVENTS.ALERT_TRIGGERED)
  async onAlertTriggered(payload: AlertTriggeredEvent): Promise<void> {
    const key = this.alertKey(payload.alert);
    if (!this.postCooldown.tryAcquire(key)) {
      this.logger.debug(`Alert post throttled (cooldown): ${key}`);
      return;
    }
    this.announced.add(key);
    await this.postToAlertChannel(
      formatProactiveAlert(payload.alert, this.timeZone),
    );
  }

  /**
   * Proactive resolved-alert posting — only for a condition we actually posted a
   * "new alert" for during the current cooldown window (avoids orphan/duplicate
   * "resolved" spam).
   */
  @OnEvent(DOMAIN_EVENTS.ALERT_RESOLVED)
  async onAlertResolved(payload: AlertResolvedEvent): Promise<void> {
    const key = this.alertKey(payload.alert);
    if (!this.announced.has(key)) return;
    this.announced.delete(key);
    await this.postToAlertChannel(
      formatResolvedAlert(payload.alert, this.timeZone),
    );
  }

  /** Safely send a message to the configured alert channel. Never throws. */
  private async postToAlertChannel(content: string): Promise<void> {
    if (!this.client || !this.ready) return;

    const channelId = this.config.get<string>(
      CONFIG_KEYS.DISCORD_ALERT_CHANNEL_ID,
    );
    if (!channelId) {
      this.logger.debug('DISCORD_ALERT_CHANNEL_ID not set — skipping post');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        this.logger.warn(`Alert channel ${channelId} not found`);
        return;
      }
      if (!channel.isTextBased() || !('send' in channel)) {
        this.logger.warn(`Alert channel ${channelId} is not a text channel`);
        return;
      }
      await channel.send(content);
    } catch (error) {
      // Never let a Discord failure crash NestJS.
      this.logger.error(
        `Failed to post to alert channel: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
