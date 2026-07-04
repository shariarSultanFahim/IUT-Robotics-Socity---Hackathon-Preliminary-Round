import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { CONFIG_KEYS } from './config/configuration';
import { SocketIoAdapter } from './realtime/socket-io.adapter';
import { SWAGGER_UI_PATH, setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);

  // Graceful shutdown so PrismaService.onModuleDestroy / Discord destroy run.
  app.enableShutdownHooks();

  // Parse cookies (HttpOnly refresh-token cookie for auth).
  app.use(cookieParser());

  // Global validation: strip unknown props, transform types, reject extras.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const dashboardOrigin = config.get<string>(
    CONFIG_KEYS.DASHBOARD_ORIGIN,
    'http://localhost:3000',
  );
  app.enableCors({ origin: dashboardOrigin, credentials: true });

  // Runtime-configured Socket.IO CORS (DASHBOARD_ORIGIN).
  app.useWebSocketAdapter(new SocketIoAdapter(app, config));

  const swaggerEnabled = config.get<boolean>(CONFIG_KEYS.SWAGGER_ENABLED, true);
  setupSwagger(app, swaggerEnabled);

  const port = config.get<number>(CONFIG_KEYS.PORT, 3001);
  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger UI at http://localhost:${port}/${SWAGGER_UI_PATH}`);
  } else {
    logger.log('Swagger disabled (SWAGGER_ENABLED=false)');
  }
}

void bootstrap();
