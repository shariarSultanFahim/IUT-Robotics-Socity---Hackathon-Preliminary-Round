import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Coerce common string booleans ("true"/"1"/"yes") to real booleans so
 * class-validator's @IsBoolean works with .env string values.
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}

export class EnvironmentVariables {
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  // Kept as a plain string; never logged. Prisma reads it directly.
  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsOptional()
  @IsString()
  DASHBOARD_ORIGIN: string = 'http://localhost:3000';

  @IsOptional()
  @IsString()
  OFFICE_TIMEZONE: string = 'Asia/Dhaka';

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(0)
  @Max(23)
  OFFICE_START_HOUR: number = 9;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(24)
  OFFICE_END_HOUR: number = 17;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  SIMULATOR_ENABLED: boolean = true;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1000)
  SIMULATOR_INTERVAL_MS: number = 10000;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(5000)
  ALERT_EVALUATION_INTERVAL_MS: number = 60000;

  @IsOptional()
  @IsString()
  DISCORD_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  DISCORD_ALERT_CHANNEL_ID?: string;

  @IsOptional()
  @IsString()
  DISCORD_COMMAND_PREFIX: string = '!';

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  SWAGGER_ENABLED: boolean = true;

  // --- Authentication ---
  // Secrets are optional so the app still boots without them (a random
  // per-process secret is used with a warning). Set them in production.
  @IsOptional()
  @IsString()
  JWT_ACCESS_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL: string = '15m';

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_DAYS: number = 7;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  AUTH_COOKIE_SECURE: boolean = false;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  AUTH_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsOptional()
  @IsString()
  SEED_ADMIN_NAME: string = 'Office Admin';

  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SEED_VIEWER_NAME: string = 'Office Viewer';

  @IsOptional()
  @IsString()
  SEED_VIEWER_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_VIEWER_PASSWORD?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    // Print property names + constraints only — NEVER the values (secrets).
    const details = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  if (validated.OFFICE_END_HOUR <= validated.OFFICE_START_HOUR) {
    throw new Error(
      'Invalid environment configuration: OFFICE_END_HOUR must be greater than OFFICE_START_HOUR',
    );
  }

  return validated;
}
