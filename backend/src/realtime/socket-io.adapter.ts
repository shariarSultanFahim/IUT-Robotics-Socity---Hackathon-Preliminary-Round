import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { CONFIG_KEYS } from '../config/configuration';

/**
 * Custom Socket.IO adapter that applies CORS from DASHBOARD_ORIGIN at runtime
 * (decorator options are evaluated too early to read validated config).
 */
export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const origin = this.config.get<string>(
      CONFIG_KEYS.DASHBOARD_ORIGIN,
      'http://localhost:3000',
    );
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
      },
    }) as Server;
  }
}
