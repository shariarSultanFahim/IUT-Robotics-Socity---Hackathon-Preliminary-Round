import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AlertsService } from '../alerts/alerts.service';
import { AuthUser } from '../auth/auth.types';
import { TokenService } from '../auth/token.service';
import {
  AlertResolvedEvent,
  AlertTriggeredEvent,
  DeviceUpdatedEvent,
  DOMAIN_EVENTS,
  OfficeHoursUpdatedEvent,
  UsageUpdatedEvent,
} from '../common/events';
import { DevicesService } from '../devices/devices.service';
import { UsageService } from '../usage/usage.service';

/**
 * Server-side Socket.IO gateway. Holds NO independent domain state: every
 * payload is a database-backed value produced by the shared services. CORS is
 * applied at runtime via SocketIoAdapter (DASHBOARD_ORIGIN).
 */
@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly usageService: UsageService,
    private readonly alertsService: AlertsService,
    private readonly tokenService: TokenService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    // Authenticate the handshake: the client sends `auth: { token }`.
    const user = this.authenticate(client);
    if (!user) {
      this.logger.debug(`Rejected unauthenticated socket ${client.id}`);
      client.emit('auth:error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    this.logger.debug(`Client connected: ${client.id} (${user.email})`);

    try {
      const [devices, usage, alerts] = await Promise.all([
        this.devicesService.getAll(),
        this.usageService.getUsageSnapshot(),
        this.alertsService.getActiveAlerts(),
      ]);
      client.emit('state:snapshot', { devices, usage, alerts });
    } catch (error) {
      this.logger.error(
        `Failed to send initial snapshot: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /** Validate the access token from the Socket.IO handshake. */
  private authenticate(client: Socket): AuthUser | null {
    const raw =
      (client.handshake.auth?.token as string | undefined) ??
      this.bearerFromHeader(client.handshake.headers?.authorization);
    if (!raw) return null;
    try {
      const payload = this.tokenService.verifyAccessToken(raw);
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  private bearerFromHeader(header?: string): string | undefined {
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' ? value : undefined;
  }

  @OnEvent(DOMAIN_EVENTS.DEVICE_UPDATED)
  onDeviceUpdated(payload: DeviceUpdatedEvent): void {
    this.server?.emit('device:update', payload.device);
  }

  @OnEvent(DOMAIN_EVENTS.USAGE_UPDATED)
  onUsageUpdated(payload: UsageUpdatedEvent): void {
    this.server?.emit('usage:update', payload.usage);
  }

  @OnEvent(DOMAIN_EVENTS.ALERT_TRIGGERED)
  onAlertTriggered(payload: AlertTriggeredEvent): void {
    this.server?.emit('alert:new', payload.alert);
  }

  @OnEvent(DOMAIN_EVENTS.ALERT_RESOLVED)
  onAlertResolved(payload: AlertResolvedEvent): void {
    this.server?.emit('alert:resolved', payload.alert);
  }

  @OnEvent(DOMAIN_EVENTS.OFFICE_HOURS_UPDATED)
  onOfficeHoursUpdated(payload: OfficeHoursUpdatedEvent): void {
    this.server?.emit('office-hours:update', payload.state);
  }
}
