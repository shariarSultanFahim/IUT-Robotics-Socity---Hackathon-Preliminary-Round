import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { RealtimeGateway } from './realtime.gateway';
import { DevicesService } from '../devices/devices.service';
import { UsageService } from '../usage/usage.service';
import { AlertsService } from '../alerts/alerts.service';
import { TokenService } from '../auth/token.service';

function makeTokens(): TokenService {
  const config = {
    get: (key: string, def?: unknown) =>
      key === 'JWT_ACCESS_SECRET'
        ? 'access'
        : key === 'JWT_REFRESH_SECRET'
          ? 'refresh'
          : def,
  } as unknown as ConfigService;
  return new TokenService(new JwtService({}), config);
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let tokens: TokenService;
  let emit: jest.Mock;

  beforeEach(() => {
    tokens = makeTokens();
    gateway = new RealtimeGateway(
      { getAll: jest.fn().mockResolvedValue([]) } as unknown as DevicesService,
      {
        getUsageSnapshot: jest.fn().mockResolvedValue({}),
      } as unknown as UsageService,
      {
        getActiveAlerts: jest.fn().mockResolvedValue([]),
      } as unknown as AlertsService,
      tokens,
    );
    emit = jest.fn();
    (gateway as unknown as { server: { emit: jest.Mock } }).server = { emit };
  });

  function mockSocket(token?: string) {
    return {
      id: 'sock1',
      data: {} as Record<string, unknown>,
      handshake: { auth: token ? { token } : {}, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  describe('handshake authentication', () => {
    it('rejects a connection with no token', async () => {
      const socket = mockSocket();
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.emit).toHaveBeenCalledWith(
        'auth:error',
        expect.any(Object),
      );
    });

    it('rejects an invalid token', async () => {
      const socket = mockSocket('garbage-token');
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('accepts a valid token, attaches the user, and emits the snapshot', async () => {
      const token = tokens.signAccessToken({
        sub: 'u1',
        email: 'a@b.com',
        name: 'A',
        role: Role.VIEWER,
      });
      const socket = mockSocket(token);
      await gateway.handleConnection(socket as any);
      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.data.user).toMatchObject({ id: 'u1', role: Role.VIEWER });
      expect(socket.emit).toHaveBeenCalledWith(
        'state:snapshot',
        expect.any(Object),
      );
    });
  });

  it('maps existing domain events to their socket events', () => {
    gateway.onDeviceUpdated({
      device: { id: 'x' } as any,
      previousStatus: 'off',
      source: 'manual',
    });
    gateway.onAlertTriggered({ alert: { id: 'a' } as any });
    expect(emit).toHaveBeenCalledWith('device:update', { id: 'x' });
    expect(emit).toHaveBeenCalledWith('alert:new', { id: 'a' });
  });
});
