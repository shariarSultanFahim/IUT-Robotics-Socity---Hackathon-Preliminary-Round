/**
 * Typed configuration accessor keys. Values are validated in env.validation.ts
 * and read through Nest's ConfigService. Secrets (DATABASE_URL, DISCORD token)
 * are intentionally not surfaced in any log-friendly structure here.
 */
export interface AppConfig {
  port: number;
  dashboardOrigin: string;
  office: {
    timezone: string;
    startHour: number;
    endHour: number;
  };
  simulator: {
    enabled: boolean;
    intervalMs: number;
  };
  powerSnapshotIntervalMs: number;
  alertEvaluationIntervalMs: number;
  history: {
    defaultLimit: number;
    maxLimit: number;
  };
  discord: {
    token?: string;
    alertChannelId?: string;
    commandPrefix: string;
  };
}

export const CONFIG_KEYS = {
  PORT: 'PORT',
  DASHBOARD_ORIGIN: 'DASHBOARD_ORIGIN',
  OFFICE_TIMEZONE: 'OFFICE_TIMEZONE',
  OFFICE_START_HOUR: 'OFFICE_START_HOUR',
  OFFICE_END_HOUR: 'OFFICE_END_HOUR',
  SIMULATOR_ENABLED: 'SIMULATOR_ENABLED',
  SIMULATOR_INTERVAL_MS: 'SIMULATOR_INTERVAL_MS',
  ALERT_EVALUATION_INTERVAL_MS: 'ALERT_EVALUATION_INTERVAL_MS',
  DISCORD_BOT_TOKEN: 'DISCORD_BOT_TOKEN',
  DISCORD_ALERT_CHANNEL_ID: 'DISCORD_ALERT_CHANNEL_ID',
  DISCORD_COMMAND_PREFIX: 'DISCORD_COMMAND_PREFIX',
  SWAGGER_ENABLED: 'SWAGGER_ENABLED',
  JWT_ACCESS_SECRET: 'JWT_ACCESS_SECRET',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  JWT_ACCESS_TTL: 'JWT_ACCESS_TTL',
  JWT_REFRESH_TTL_DAYS: 'JWT_REFRESH_TTL_DAYS',
  AUTH_COOKIE_SECURE: 'AUTH_COOKIE_SECURE',
  AUTH_COOKIE_SAME_SITE: 'AUTH_COOKIE_SAME_SITE',
  SEED_ADMIN_NAME: 'SEED_ADMIN_NAME',
  SEED_ADMIN_EMAIL: 'SEED_ADMIN_EMAIL',
  SEED_ADMIN_PASSWORD: 'SEED_ADMIN_PASSWORD',
  SEED_VIEWER_NAME: 'SEED_VIEWER_NAME',
  SEED_VIEWER_EMAIL: 'SEED_VIEWER_EMAIL',
  SEED_VIEWER_PASSWORD: 'SEED_VIEWER_PASSWORD',
} as const;
