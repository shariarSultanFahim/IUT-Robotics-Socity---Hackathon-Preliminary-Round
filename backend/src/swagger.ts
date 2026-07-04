import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api/docs';
export const SWAGGER_JSON_PATH = 'api/docs-json';

/** Build the OpenAPI document (no route registration — safe to call in tests). */
export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Office Device Monitor API')
    .setDescription(
      'REST API for simulated office devices, electricity usage, historical ' +
        'records, alerts, and system health.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the access token from POST /api/auth/login',
      },
      'bearer',
    )
    .addTag('Auth')
    .addTag('Health')
    .addTag('Devices')
    .addTag('Usage')
    .addTag('History')
    .addTag('Alerts')
    .build();
  return SwaggerModule.createDocument(app, config);
}

/**
 * Register Swagger UI at /api/docs and the OpenAPI JSON at /api/docs-json when
 * enabled. When disabled, nothing is registered and null is returned.
 */
export function setupSwagger(
  app: INestApplication,
  enabled: boolean,
): OpenAPIObject | null {
  if (!enabled) return null;
  const document = buildSwaggerDocument(app);
  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
  });
  return document;
}
