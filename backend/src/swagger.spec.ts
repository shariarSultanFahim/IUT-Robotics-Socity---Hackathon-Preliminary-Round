import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import {
  SWAGGER_JSON_PATH,
  SWAGGER_UI_PATH,
  buildSwaggerDocument,
  setupSwagger,
} from './swagger';

/**
 * Build the real Nest app (with a fake Prisma + simulator disabled) so we can
 * assert the generated OpenAPI document without touching a database.
 */
describe('Swagger', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ||= 'postgresql://u:p@localhost:5432/db';
    process.env.SIMULATOR_ENABLED = 'false';

    const prismaFake = {
      onModuleInit: async () => {},
      onModuleDestroy: async () => {},
      isHealthy: async () => true,
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaFake)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('exposes the expected route constants', () => {
    expect(SWAGGER_UI_PATH).toBe('api/docs');
    expect(SWAGGER_JSON_PATH).toBe('api/docs-json');
  });

  it('builds an OpenAPI document with the configured metadata and tags', () => {
    const doc = buildSwaggerDocument(app);
    expect(doc.info.title).toBe('Office Device Monitor API');
    expect(doc.info.version).toBe('1.0.0');
    const tagNames = (doc.tags ?? []).map((t) => t.name);
    expect(tagNames).toEqual(
      expect.arrayContaining([
        'Health',
        'Devices',
        'Usage',
        'History',
        'Alerts',
      ]),
    );
  });

  it('documents every required path', () => {
    const doc = buildSwaggerDocument(app);
    const required = [
      '/health',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/devices',
      '/api/devices/{id}',
      '/api/devices/{id}/status',
      '/api/usage',
      '/api/alerts',
      '/api/office-hours',
    ];
    for (const path of required) {
      expect(doc.paths[path]).toBeDefined();
    }
  });

  it('no longer documents removed history endpoints', () => {
    const doc = buildSwaggerDocument(app);
    expect(doc.paths['/api/history/devices']).toBeUndefined();
    expect(doc.paths['/api/history/power']).toBeUndefined();
    expect(doc.paths['/api/alerts/history']).toBeUndefined();
  });

  it('documents Bearer authentication', () => {
    const doc = buildSwaggerDocument(app);
    expect(doc.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('does not initialize Swagger when disabled', () => {
    expect(setupSwagger(app, false)).toBeNull();
  });
});
